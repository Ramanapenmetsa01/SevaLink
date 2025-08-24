const mongoose = require('mongoose');

const voiceRequestSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // Original user input (if any)
  originalText: {
    type: String,
    trim: true
  },
  
  // Transcribed text from audio
  transcribedText: {
    type: String,
    required: true,
    trim: true
  },
  
  // Audio metadata
  audioMetadata: {
    duration: {
      type: Number,
      required: true // in seconds
    },
    fileSize: {
      type: Number,
      required: true // in bytes
    },
    format: {
      type: String,
      required: true // audio format (webm, mp3, wav, etc.)
    },
    language: {
      type: String,
      enum: ['en', 'hi', 'te'], // English, Hindi, Telugu
      default: 'en'
    },
    sampleRate: Number,
    channels: Number
  },
  
  // Processing information
  processingStatus: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'failed'],
    default: 'pending'
  },
  
  // Whisper API response data
  whisperResponse: {
    confidence: Number, // Overall confidence score
    segments: [{
      text: String,
      start: Number,
      end: Number,
      confidence: Number
    }],
    detectedLanguage: String,
    processingTime: Number // in milliseconds
  },
  
  // Processing timestamps
  processedAt: Date,
  submittedAt: {
    type: Date,
    default: Date.now
  },
  
  // Error handling
  errorMessage: String,
  retryCount: {
    type: Number,
    default: 0,
    max: 3
  },
  
  // Request categorization (optional - for future AI classification)
  category: {
    type: String,
    enum: ['blood_request', 'elder_support', 'complaint', 'general_inquiry', 'emergency', 'other'],
    default: 'general_inquiry'
  },
  
  // Priority level (can be auto-detected from content)
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  
  // Status for volunteer access
  status: {
    type: String,
    enum: ['pending', 'reviewed', 'assigned', 'completed', 'cancelled'],
    default: 'pending'
  },
  
  // Volunteer assignment
  assignedVolunteer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  assignedAt: Date,
  
  // Follow-up actions
  followUpRequired: {
    type: Boolean,
    default: true
  },
  
  // Tags for better organization
  tags: [String],
  
  // Notes from volunteers/admins
  notes: [{
    content: String,
    addedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    addedAt: {
      type: Date,
      default: Date.now
    }
  }]
}, {
  timestamps: true
});

// Indexes for efficient queries
voiceRequestSchema.index({ user: 1, createdAt: -1 });
voiceRequestSchema.index({ processingStatus: 1 });
voiceRequestSchema.index({ status: 1, priority: -1 });
voiceRequestSchema.index({ assignedVolunteer: 1 });
voiceRequestSchema.index({ category: 1, status: 1 });
voiceRequestSchema.index({ 'audioMetadata.language': 1 });

// Virtual for request age
voiceRequestSchema.virtual('ageInHours').get(function() {
  return Math.floor((Date.now() - this.createdAt) / (1000 * 60 * 60));
});

// Method to update processing status
voiceRequestSchema.methods.updateProcessingStatus = function(status, errorMessage = null) {
  this.processingStatus = status;
  if (status === 'completed') {
    this.processedAt = new Date();
  }
  if (errorMessage) {
    this.errorMessage = errorMessage;
    this.retryCount += 1;
  }
  return this.save();
};

// Method to assign volunteer
voiceRequestSchema.methods.assignToVolunteer = function(volunteerId) {
  this.assignedVolunteer = volunteerId;
  this.status = 'assigned';
  this.assignedAt = new Date();
  return this.save();
};

// Method to add note
voiceRequestSchema.methods.addNote = function(content, addedBy) {
  this.notes.push({
    content,
    addedBy
  });
  return this.save();
};

// Static method to get pending requests for volunteers
voiceRequestSchema.statics.getPendingRequests = function(filters = {}) {
  return this.find({
    status: 'pending',
    processingStatus: 'completed',
    ...filters
  })
  .populate('user', 'name phone email')
  .sort({ priority: -1, createdAt: -1 });
};

// Static method to get user's voice requests
voiceRequestSchema.statics.getUserRequests = function(userId) {
  return this.find({ user: userId })
    .populate('assignedVolunteer', 'name phone')
    .sort({ createdAt: -1 });
};

// Static method to get volunteer's assigned requests
voiceRequestSchema.statics.getVolunteerRequests = function(volunteerId) {
  return this.find({ assignedVolunteer: volunteerId })
    .populate('user', 'name phone email')
    .sort({ assignedAt: -1 });
};

module.exports = mongoose.model('VoiceRequest', voiceRequestSchema);
