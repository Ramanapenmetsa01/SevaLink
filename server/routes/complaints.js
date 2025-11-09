const express = require('express');
const { body, validationResult } = require('express-validator');
const router = express.Router();
const auth = require('../middleware/auth');
const Complaint = require('../models/Complaint');
const User = require('../models/User');

// @route   GET /api/complaints
// @desc    Get complaints based on user role and filters
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    const {
      status,
      category,
      type,
      priority,
      page = 1,
      limit = 10,
      nearby,
      latitude,
      longitude,
      maxDistance = 10000
    } = req.query;

    const user = await User.findById(req.user.userId);
    let query = {};
    let complaints;

    // Build query based on filters
    if (status) query.status = status;
    if (category) query.category = category;
    if (type) query.type = type;
    if (priority) query.priority = priority;

    // Role-based filtering
    if (user.role === 'citizen') {
      // Citizens see their own complaints
      query.citizen = req.user.userId;
    } else if (user.role === 'volunteer') {
      // Volunteers see open complaints and their assigned ones
      if (status === 'assigned' || status === 'in_progress') {
        query.assignedVolunteer = req.user.userId;
      } else {
        query.$or = [
          { status: 'open' },
          { assignedVolunteer: req.user.userId }
        ];
      }
    }
    // Admins see all complaints (no additional filtering)

    // Handle nearby complaints
    if (nearby === 'true' && latitude && longitude) {
      complaints = await Complaint.findNearby(
        [parseFloat(longitude), parseFloat(latitude)],
        parseInt(maxDistance),
        query
      );
    } else {
      // Regular query with pagination
      const skip = (parseInt(page) - 1) * parseInt(limit);

      complaints = await Complaint.find(query)
        .populate('citizen', 'name phone email avatar')
        .populate('assignedVolunteer', 'name phone email avatar')
        .populate('volunteerApplications.volunteer', 'name phone email avatar')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit));
    }

    const total = await Complaint.countDocuments(query);

    res.json({
      message: 'Complaints retrieved successfully',
      complaints,
      pagination: {
        current: parseInt(page),
        total: Math.ceil(total / parseInt(limit)),
        count: complaints.length,
        totalComplaints: total
      }
    });

  } catch (error) {
    console.error('Get complaints error:', error);
    res.status(500).json({
      message: 'Server error retrieving complaints',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// @route   POST /api/complaints
// @desc    Create a new complaint or service request
// @access  Private (Citizens only)
router.post('/', [
  auth,
  body('title')
    .trim()
    .isLength({ min: 5, max: 200 })
    .withMessage('Title must be between 5 and 200 characters'),
  body('description')
    .trim()
    .isLength({ min: 10, max: 2000 })
    .withMessage('Description must be between 10 and 2000 characters'),
  body('category')
    .isIn([
      'infrastructure', 'sanitation', 'water_supply', 'electricity',
      'road_maintenance', 'waste_management', 'public_safety', 'healthcare',
      'education', 'transportation', 'elderly_care', 'emergency_assistance',
      'community_service', 'other'
    ])
    .withMessage('Invalid category'),
  body('type')
    .isIn(['complaint', 'service_request'])
    .withMessage('Type must be either complaint or service_request'),
  body('priority')
    .optional()
    .isIn(['low', 'medium', 'high', 'urgent'])
    .withMessage('Invalid priority level')
], async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const user = await User.findById(req.user.userId);

    // Only citizens can create complaints
    if (user.role !== 'citizen') {
      return res.status(403).json({
        message: 'Only citizens can create complaints and service requests'
      });
    }

    const {
      title,
      description,
      category,
      type,
      priority = 'medium',
      location,
      urgencyLevel = 5,
      expectedResolutionTime,
      contactInfo,
      tags = [],
      isPublic = true
    } = req.body;

    // Create new complaint
    const complaint = new Complaint({
      title,
      description,
      category,
      type,
      priority,
      citizen: req.user.userId,
      location,
      urgencyLevel,
      expectedResolutionTime,
      contactInfo: {
        phone: contactInfo?.phone || user.phone,
        email: contactInfo?.email || user.email,
        preferredContactMethod: contactInfo?.preferredContactMethod || 'app'
      },
      tags,
      isPublic
    });

    await complaint.save();

    // Populate the response
    await complaint.populate('citizen', 'name phone email avatar');

    res.status(201).json({
      message: `${type === 'complaint' ? 'Complaint' : 'Service request'} created successfully`,
      complaint
    });

  } catch (error) {
    console.error('Create complaint error:', error);
    res.status(500).json({
      message: 'Server error creating complaint',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// @route   GET /api/complaints/:id
// @desc    Get single complaint by ID
// @access  Private
router.get('/:id', auth, async (req, res) => {
  try {
    const complaint = await Complaint.findById(req.params.id)
      .populate('citizen', 'name phone email avatar address')
      .populate('assignedVolunteer', 'name phone email avatar')
      .populate('volunteerApplications.volunteer', 'name phone email avatar volunteerInfo')
      .populate('updates.updatedBy', 'name avatar');

    if (!complaint) {
      return res.status(404).json({
        message: 'Complaint not found'
      });
    }

    const user = await User.findById(req.user.userId);

    // Check access permissions
    if (user.role === 'citizen' && complaint.citizen._id.toString() !== req.user.userId) {
      return res.status(403).json({
        message: 'Access denied. You can only view your own complaints.'
      });
    }

    res.json({
      message: 'Complaint retrieved successfully',
      complaint
    });

  } catch (error) {
    console.error('Get complaint error:', error);
    res.status(500).json({
      message: 'Server error retrieving complaint',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// @route   POST /api/complaints/:id/apply
// @desc    Apply as volunteer for a complaint
// @access  Private (Volunteers only)
router.post('/:id/apply', [
  auth,
  body('message')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Message cannot be more than 500 characters'),
  body('estimatedTime')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Estimated time cannot be more than 100 characters')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const user = await User.findById(req.user.userId);

    if (user.role !== 'volunteer') {
      return res.status(403).json({
        message: 'Only volunteers can apply for complaints'
      });
    }

    const complaint = await Complaint.findById(req.params.id);

    if (!complaint) {
      return res.status(404).json({
        message: 'Complaint not found'
      });
    }

    if (complaint.status !== 'open') {
      return res.status(400).json({
        message: 'This complaint is no longer accepting applications'
      });
    }

    const { message = '', estimatedTime = '' } = req.body;

    try {
      await complaint.addVolunteerApplication(req.user.userId, message, estimatedTime);

      await complaint.populate('volunteerApplications.volunteer', 'name phone email avatar');

      res.json({
        message: 'Application submitted successfully',
        complaint
      });

    } catch (applicationError) {
      return res.status(400).json({
        message: applicationError.message
      });
    }

  } catch (error) {
    console.error('Apply for complaint error:', error);
    res.status(500).json({
      message: 'Server error applying for complaint',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// @route   POST /api/complaints/:id/assign/:volunteerId
// @desc    Assign complaint to a volunteer (Citizens and Admins)
// @access  Private
router.post('/:id/assign/:volunteerId', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    const complaint = await Complaint.findById(req.params.id);

    if (!complaint) {
      return res.status(404).json({
        message: 'Complaint not found'
      });
    }

    // Check permissions
    if (user.role === 'citizen' && complaint.citizen.toString() !== req.user.userId) {
      return res.status(403).json({
        message: 'Only the complaint creator or admin can assign volunteers'
      });
    }

    if (user.role === 'volunteer') {
      return res.status(403).json({
        message: 'Volunteers cannot assign complaints'
      });
    }

    const volunteer = await User.findById(req.params.volunteerId);

    if (!volunteer || volunteer.role !== 'volunteer') {
      return res.status(404).json({
        message: 'Volunteer not found'
      });
    }

    if (complaint.status !== 'open') {
      return res.status(400).json({
        message: 'This complaint cannot be assigned'
      });
    }

    await complaint.assignVolunteer(req.params.volunteerId);
    await complaint.populate('assignedVolunteer', 'name phone email avatar');
    await complaint.populate('citizen', 'name phone email');

    // Create a Request record for the volunteer's accepted requests
    const Request = require('../models/Request');

    const requestData = {
      type: 'complaint',
      user: complaint.citizen._id,
      name: complaint.citizen.name,
      phone: complaint.contactInfo?.phone || complaint.citizen.phone,
      title: complaint.title,
      description: complaint.description,
      category: complaint.category,
      priority: complaint.priority,
      images: complaint.images || [],
      location: {
        type: 'manual',
        address: complaint.location?.address?.street ||
                `${complaint.location?.address?.city || ''}, ${complaint.location?.address?.state || ''}`.trim().replace(/^,\s*|,\s*$/g, '') ||
                'Location not specified',
        street: complaint.location?.address?.street || '',
        city: complaint.location?.address?.city || '',
        state: complaint.location?.address?.state || '',
        pincode: complaint.location?.address?.pincode || '',
        country: 'India',
        coordinates: complaint.location?.coordinates || null
      },
      status: 'accepted',
      accepters: [{
        user: req.params.volunteerId,
        acceptedAt: new Date(),
        status: 'accepted'
      }]
    };

    try {
      const request = new Request(requestData);
      await request.save();
      console.log('Created Request record for complaint:', request._id);
    } catch (error) {
      console.error('Error creating Request record for complaint:', error);
      // Don't fail the complaint assignment if Request creation fails
    }

    res.json({
      message: 'Complaint assigned successfully',
      complaint
    });

  } catch (error) {
    console.error('Assign complaint error:', error);
    res.status(500).json({
      message: 'Server error assigning complaint',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// @route   PUT /api/complaints/:id/status
// @desc    Update complaint status
// @access  Private (Assigned volunteer or Admin)
router.put('/:id/status', [
  auth,
  body('status')
    .isIn(['open', 'assigned', 'in_progress', 'resolved', 'closed', 'cancelled'])
    .withMessage('Invalid status'),
  body('message')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Update message cannot be more than 500 characters')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const user = await User.findById(req.user.userId);
    const complaint = await Complaint.findById(req.params.id);

    if (!complaint) {
      return res.status(404).json({
        message: 'Complaint not found'
      });
    }

    const { status, message = '' } = req.body;
    const oldStatus = complaint.status;

    // Check permissions
    if (user.role === 'volunteer' && complaint.assignedVolunteer?.toString() !== req.user.userId) {
      return res.status(403).json({
        message: 'You can only update complaints assigned to you'
      });
    }

    if (user.role === 'citizen' && complaint.citizen.toString() !== req.user.userId) {
      return res.status(403).json({
        message: 'You can only update your own complaints'
      });
    }

    // Update status
    complaint.status = status;

    if (status === 'resolved') {
      complaint.resolvedAt = new Date();
    }

    if (status === 'closed') {
      complaint.actualCompletionTime = new Date();
    }

    // Add update entry
    await complaint.addUpdate(
      message || `Status changed from ${oldStatus} to ${status}`,
      req.user.userId,
      { from: oldStatus, to: status }
    );

    await complaint.populate('assignedVolunteer', 'name phone email avatar');
    await complaint.populate('citizen', 'name phone email avatar');

    res.json({
      message: 'Complaint status updated successfully',
      complaint
    });

  } catch (error) {
    console.error('Update complaint status error:', error);
    res.status(500).json({
      message: 'Server error updating complaint status',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// @route   POST /api/complaints/:id/updates
// @desc    Add update to complaint
// @access  Private (Involved parties only)
router.post('/:id/updates', [
  auth,
  body('message')
    .trim()
    .isLength({ min: 1, max: 500 })
    .withMessage('Update message must be between 1 and 500 characters')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const user = await User.findById(req.user.userId);
    const complaint = await Complaint.findById(req.params.id);

    if (!complaint) {
      return res.status(404).json({
        message: 'Complaint not found'
      });
    }

    // Check if user is involved in this complaint
    const isInvolved = complaint.citizen.toString() === req.user.userId ||
                      complaint.assignedVolunteer?.toString() === req.user.userId ||
                      user.role === 'admin';

    if (!isInvolved) {
      return res.status(403).json({
        message: 'You can only add updates to complaints you are involved in'
      });
    }

    const { message } = req.body;

    await complaint.addUpdate(message, req.user.userId);
    await complaint.populate('updates.updatedBy', 'name avatar');

    res.json({
      message: 'Update added successfully',
      updates: complaint.updates
    });

  } catch (error) {
    console.error('Add complaint update error:', error);
    res.status(500).json({
      message: 'Server error adding update',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// @route   GET /api/complaints/dashboard/volunteer
// @desc    Get volunteer dashboard data
// @access  Private (Volunteers only)
router.get('/dashboard/volunteer', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);

    if (user.role !== 'volunteer') {
      return res.status(403).json({
        message: 'Access denied. Volunteers only.'
      });
    }

    const [assignedComplaints, availableComplaints] = await Complaint.getVolunteerDashboard(req.user.userId);

    const stats = {
      assigned: assignedComplaints.length,
      available: availableComplaints.length,
      totalResolved: await Complaint.countDocuments({
        assignedVolunteer: req.user.userId,
        status: 'resolved'
      })
    };

    res.json({
      message: 'Volunteer dashboard data retrieved successfully',
      stats,
      assignedComplaints,
      availableComplaints
    });

  } catch (error) {
    console.error('Volunteer dashboard error:', error);
    res.status(500).json({
      message: 'Server error retrieving dashboard data',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

module.exports = router;
