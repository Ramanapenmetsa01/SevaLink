const mongoose = require('mongoose');

const requestSchema = new mongoose.Schema({
  // Common fields for all request types
  type: {
    type: String,
    required: [true, 'Request type is required'],
    enum: ['blood', 'elder_support', 'complaint']
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true
  },
  status: {
    type: String,
    enum: ['pending', 'accepted'],
    default: 'pending'
  },
  location: {
    type: {
      type: String,
      enum: ['manual', 'account', 'map'],
      default: 'manual'
    },
    address: {
      type: String,
      required: [true, 'Address is required']
    },
    street: String,
    city: String,
    state: String,
    pincode: String,
    country: {
      type: String,
      default: 'India'
    },
    coordinates: {
      lat: Number,
      lng: Number
    }
  },

  // Contact information
  phone: {
    type: String,
    required: [true, 'Phone number is required']
  },

  // Blood request accepters (for tracking who volunteered)
  accepters: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    acceptedAt: {
      type: Date,
      default: Date.now
    },
    status: {
      type: String,
      enum: ['pending', 'accepted'],
      default: 'pending'
    }
  }],

  // Blood request specific fields
  bloodType: {
    type: String,
    enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'Not specified'],
    required: function() {
      return this.type === 'blood';
    }
  },
  urgencyLevel: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium',
    required: function() {
      return this.type === 'blood';
    }
  },

  // Elder support specific fields
  serviceType: {
    type: String,
    enum: [
      'Medicine Delivery',
      'Grocery Shopping', 
      'Medical Appointment',
      'Household Help',
      'Companionship',
      'Emergency Assistance',
      'Other'
    ],
    required: function() {
      return this.type === 'elder_support';
    }
  },
  dueDate: {
    type: Date,
    required: function() {
      return this.type === 'elder_support';
    }
  },

  // Complaint specific fields
  title: {
    type: String,
    required: function() {
      return this.type === 'complaint';
    },
    trim: true,
    maxlength: [200, 'Title cannot be more than 200 characters']
  },
  description: {
    type: String,
    required: function() {
      return this.type === 'complaint';
    },
    trim: true,
    maxlength: [2000, 'Description cannot be more than 2000 characters']
  },
  category: {
    type: String,
    enum: [
      'Infrastructure',
      'Sanitation', 
      'Water Supply',
      'Electricity',
      'Road Maintenance',
      'Waste Management',
      'Public Safety',
      'Healthcare',
      'Education',
      'Transportation',
      'Other'
    ],
    required: function() {
      return this.type === 'complaint';
    }
  },
  images: [{
    url: String,
    filename: String,
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],

  // Volunteer assignment
  assignedVolunteer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  assignedAt: Date,
  completedAt: Date,

  // Updates and communication
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

  // Volunteer applications (for complaints and elder support)
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

  // Priority and urgency
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },



  // Additional metadata
  tags: [String],
  isPublic: {
    type: Boolean,
    default: true
  },
  rating: {
    score: {
      type: Number,
      min: 1,
      max: 5
    },
    feedback: String,
    ratedAt: Date
  }
}, {
  timestamps: true
});

// Indexes for efficient queries
requestSchema.index({ user: 1, createdAt: -1 });
requestSchema.index({ type: 1, status: 1 });
requestSchema.index({ assignedVolunteer: 1, status: 1 });
requestSchema.index({ 'location.coordinates.lat': 1, 'location.coordinates.lng': 1 });

// Virtual for request age
requestSchema.virtual('ageInDays').get(function() {
  return Math.floor((Date.now() - this.createdAt) / (1000 * 60 * 60 * 24));
});

// Method to add update
requestSchema.methods.addUpdate = function(message, updatedBy, statusChange = null) {
  this.updates.push({
    message,
    updatedBy,
    statusChange
  });
  return this.save();
};

// Method to assign volunteer
requestSchema.methods.assignVolunteer = function(volunteerId) {
  this.assignedVolunteer = volunteerId;
  this.status = this.type === 'blood' ? 'in_progress' : 'assigned';
  this.assignedAt = new Date();
  
  this.updates.push({
    message: 'Request assigned to volunteer',
    updatedBy: volunteerId,
    statusChange: {
      from: 'pending',
      to: this.status
    }
  });
  
  return this.save();
};

// Method to apply as volunteer
requestSchema.methods.addVolunteerApplication = function(volunteerId, message, estimatedTime) {
  // Check if volunteer already applied
  const existingApplication = this.volunteerApplications.find(
    app => app.volunteer.toString() === volunteerId.toString()
  );
  
  if (existingApplication) {
    throw new Error('You have already applied for this request');
  }
  
  this.volunteerApplications.push({
    volunteer: volunteerId,
    message,
    estimatedTime
  });
  
  return this.save();
};

// Static method to find nearby requests
requestSchema.statics.findNearby = function(coordinates, maxDistance = 10000, filters = {}) {
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
    .populate('user', 'name phone email')
    .populate('assignedVolunteer', 'name phone email')
    .sort({ createdAt: -1 });
};

// Static method to get user's dashboard data
requestSchema.statics.getUserDashboard = function(userId) {
  return Promise.all([
    this.countDocuments({ user: userId }),
    this.countDocuments({ user: userId, status: 'pending' }),
    this.countDocuments({ user: userId, status: 'accepted' }),
    this.countDocuments({ user: userId, type: 'blood' }),
    this.countDocuments({ user: userId, type: 'elder_support' }),
    this.countDocuments({ user: userId, type: 'complaint' }),
    this.find({ user: userId })
      .sort({ createdAt: -1 })
      .limit(5)
      .populate('assignedVolunteer', 'name')
  ]).then(([total, pending, accepted, blood, elderSupport, complaints, recent]) => ({
    stats: {
      totalRequests: total,
      pendingRequests: pending,
      acceptedRequests: accepted,
      bloodRequests: blood,
      elderSupport,
      complaints
    },
    recentRequests: recent
  }));
};

module.exports = mongoose.model('Request', requestSchema);
