const mongoose = require('mongoose');

const chatSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // Message content
  message: {
    type: String,
    required: true,
    trim: true
  },
  
  // Bot response
  response: {
    type: String,
    required: true
  },
  
  // Message type
  messageType: {
    type: String,
    enum: ['text', 'voice'],
    default: 'text'
  },
  
  // Category detected by AI
  category: {
    type: String,
    enum: ['blood_request', 'elder_support', 'complaint', 'emergency', 'general_inquiry'],
    default: 'general_inquiry'
  },
  
  // Priority level
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  
  // Whether this message created a request
  createdRequest: {
    type: Boolean,
    default: false
  },
  
  // Reference to the request if one was created
  requestId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Request',
    default: null
  },
  
  // Language of the message
  language: {
    type: String,
    default: 'en'
  },
  
  // Voice-specific metadata
  voiceMetadata: {
    confidence: Number,
    duration: Number,
    detectedLanguage: String
  },
  
  // AI processing metadata
  aiMetadata: {
    usingFallback: {
      type: Boolean,
      default: false
    },
    processingTime: Number,
    geminiResponse: String
  },
  
  // Session information
  sessionId: {
    type: String,
    default: function() {
      return new Date().toISOString().split('T')[0]; // Daily session
    }
  }
}, {
  timestamps: true
});

// Indexes for efficient queries
chatSchema.index({ user: 1, createdAt: -1 });
chatSchema.index({ sessionId: 1, user: 1 });
chatSchema.index({ category: 1, createdRequest: 1 });
chatSchema.index({ messageType: 1, user: 1 });

// Virtual for message age
chatSchema.virtual('ageInMinutes').get(function() {
  return Math.floor((Date.now() - this.createdAt) / (1000 * 60));
});

// Method to mark as request creator
chatSchema.methods.markAsRequestCreator = function(requestId) {
  this.createdRequest = true;
  this.requestId = requestId;
  return this.save();
};

module.exports = mongoose.model('Chat', chatSchema);
