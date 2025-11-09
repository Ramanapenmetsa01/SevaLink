const mongoose = require('mongoose');

const complaintSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Title is required'],
    trim: true,
    maxlength: [200, 'Title cannot be more than 200 characters']
  },
  description: {
    type: String,
    required: [true, 'Description is required'],
    trim: true,
    maxlength: [2000, 'Description cannot be more than 2000 characters']
  },
  category: {
    type: String,
    required: [true, 'Category is required'],
    enum: [
      'infrastructure', 
      'sanitation', 
      'water_supply', 
      'electricity', 
      'road_maintenance', 
      'waste_management', 
      'public_safety', 
      'healthcare', 
      'education', 
      'transportation',
      'elderly_care',
      'emergency_assistance',
      'community_service',
      'other'
    ]
  },
  type: {
    type: String,
    required: [true, 'Type is required'],
    enum: ['complaint', 'service_request'],
    default: 'complaint'
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  status: {
    type: String,
    enum: ['open', 'assigned', 'in_progress', 'resolved', 'closed', 'cancelled'],
    default: 'open'
  },
  citizen: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  assignedVolunteer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  location: {
    address: {
      street: String,
      city: String,
      state: String,
      pincode: String
    },
    coordinates: {
      latitude: Number,
      longitude: Number
    }
  },
  images: [{
    url: String,
    description: String,
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],
  urgencyLevel: {
    type: Number,
    min: 1,
    max: 10,
    default: 5
  },
  expectedResolutionTime: {
    type: String,
    enum: ['immediate', 'within_24h', 'within_week', 'within_month', 'flexible']
  },
  contactInfo: {
    phone: String,
    email: String,
    preferredContactMethod: {
      type: String,
      enum: ['phone', 'email', 'app'],
      default: 'app'
    }
  },
  updates: [{
    message: {
      type: String,
      required: true
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    updatedAt: {
      type: Date,
      default: Date.now
    },
    statusChange: {
      from: String,
      to: String
    }
  }],
  volunteerApplications: [{
    volunteer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    appliedAt: {
      type: Date,
      default: Date.now
    },
    message: String,
    estimatedTime: String,
    status: {
      type: String,
      enum: ['pending', 'accepted', 'rejected'],
      default: 'pending'
    }
  }],
  rating: {
    score: {
      type: Number,
      min: 1,
      max: 5
    },
    feedback: String,
    ratedAt: Date
  },
  isPublic: {
    type: Boolean,
    default: true
  },
  tags: [String],
  resolvedAt: Date,
  assignedAt: Date,
  estimatedCompletionTime: Date,
  actualCompletionTime: Date
}, {
  timestamps: true
});

// Index for geospatial queries
complaintSchema.index({ 'location.coordinates': '2dsphere' });

// Index for efficient queries
complaintSchema.index({ status: 1, category: 1 });
complaintSchema.index({ citizen: 1, createdAt: -1 });
complaintSchema.index({ assignedVolunteer: 1, status: 1 });

// Virtual for complaint age
complaintSchema.virtual('ageInDays').get(function() {
  return Math.floor((Date.now() - this.createdAt) / (1000 * 60 * 60 * 24));
});

// Method to add update
complaintSchema.methods.addUpdate = function(message, updatedBy, statusChange = null) {
  this.updates.push({
    message,
    updatedBy,
    statusChange
  });
  return this.save();
};

// Method to assign volunteer
complaintSchema.methods.assignVolunteer = function(volunteerId) {
  this.assignedVolunteer = volunteerId;
  this.status = 'assigned';
  this.assignedAt = new Date();
  
  this.updates.push({
    message: 'Complaint assigned to volunteer',
    updatedBy: volunteerId,
    statusChange: {
      from: 'open',
      to: 'assigned'
    }
  });
  
  return this.save();
};

// Method to apply as volunteer
complaintSchema.methods.addVolunteerApplication = function(volunteerId, message, estimatedTime) {
  // Check if volunteer already applied
  const existingApplication = this.volunteerApplications.find(
    app => app.volunteer.toString() === volunteerId.toString()
  );
  
  if (existingApplication) {
    throw new Error('You have already applied for this complaint');
  }
  
  this.volunteerApplications.push({
    volunteer: volunteerId,
    message,
    estimatedTime
  });
  
  return this.save();
};

// Static method to find nearby complaints
complaintSchema.statics.findNearby = function(coordinates, maxDistance = 10000, filters = {}) {
  const query = {
    'location.coordinates': {
      $near: {
        $geometry: {
          type: 'Point',
          coordinates: coordinates
        },
        $maxDistance: maxDistance
      }
    },
    ...filters
  };
  
  return this.find(query)
    .populate('citizen', 'name phone email')
    .populate('assignedVolunteer', 'name phone email')
    .sort({ createdAt: -1 });
};

// Static method to get complaints by status
complaintSchema.statics.getByStatus = function(status, limit = 50) {
  return this.find({ status })
    .populate('citizen', 'name phone email')
    .populate('assignedVolunteer', 'name phone email')
    .sort({ createdAt: -1 })
    .limit(limit);
};

// Static method to get volunteer dashboard data
complaintSchema.statics.getVolunteerDashboard = function(volunteerId) {
  return Promise.all([
    this.find({ assignedVolunteer: volunteerId, status: { $in: ['assigned', 'in_progress'] } })
      .populate('citizen', 'name phone email')
      .sort({ createdAt: -1 }),
    this.find({ 
      status: 'open',
      'volunteerApplications.volunteer': { $ne: volunteerId }
    })
      .populate('citizen', 'name phone email')
      .sort({ priority: -1, createdAt: -1 })
      .limit(20)
  ]);
};

module.exports = mongoose.model('Complaint', complaintSchema);
