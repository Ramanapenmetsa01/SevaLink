const { body, validationResult } = require('express-validator');

// Validation rules for voice processing
const voiceProcessingValidation = [
  body('language')
    .optional()
    .isIn(['auto', 'en', 'hi', 'te'])
    .withMessage('Language must be one of: auto, en, hi, te'),
  
  body('duration')
    .optional()
    .isFloat({ min: 0, max: 300 })
    .withMessage('Duration must be between 0 and 300 seconds'),
  
  body('originalText')
    .optional()
    .isLength({ max: 1000 })
    .withMessage('Original text cannot exceed 1000 characters')
    .trim()
    .escape()
];

// Validation rules for text messages
const textMessageValidation = [
  body('message')
    .notEmpty()
    .withMessage('Message is required')
    .isLength({ min: 1, max: 2000 })
    .withMessage('Message must be between 1 and 2000 characters')
    .trim()
    .escape(),
  
  body('language')
    .optional()
    .isIn(['en', 'hi', 'te'])
    .withMessage('Language must be one of: en, hi, te')
];

// Middleware to handle validation errors
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array().map(error => ({
        field: error.path,
        message: error.msg,
        value: error.value
      }))
    });
  }
  
  next();
};

// Audio file validation middleware
const validateAudioFile = (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No audio file provided',
        error: 'MISSING_AUDIO_FILE'
      });
    }

    const file = req.file;
    const maxSize = 25 * 1024 * 1024; // 25MB
    const supportedMimeTypes = [
      'audio/webm',
      'audio/mp3',
      'audio/mpeg',
      'audio/wav',
      'audio/ogg',
      'audio/m4a',
      'audio/mp4'
    ];

    // Check file size
    if (file.size > maxSize) {
      return res.status(400).json({
        success: false,
        message: `File size (${Math.round(file.size / 1024 / 1024)}MB) exceeds maximum limit of 25MB`,
        error: 'FILE_TOO_LARGE'
      });
    }

    // Check minimum file size
    if (file.size < 1000) {
      return res.status(400).json({
        success: false,
        message: 'Audio file is too small or corrupted',
        error: 'FILE_TOO_SMALL'
      });
    }

    // Check MIME type
    if (!supportedMimeTypes.includes(file.mimetype)) {
      return res.status(400).json({
        success: false,
        message: `Unsupported audio format: ${file.mimetype}. Supported formats: ${supportedMimeTypes.join(', ')}`,
        error: 'UNSUPPORTED_FORMAT'
      });
    }

    // Check if buffer is valid
    if (!file.buffer || file.buffer.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid audio file buffer',
        error: 'INVALID_BUFFER'
      });
    }

    next();
  } catch (error) {
    console.error('Audio validation error:', error);
    res.status(500).json({
      success: false,
      message: 'Error validating audio file',
      error: 'VALIDATION_ERROR'
    });
  }
};

// Rate limiting for voice processing
const voiceRateLimit = (req, res, next) => {
  const userId = req.user?.id;
  
  if (!userId) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required',
      error: 'UNAUTHORIZED'
    });
  }

  // Simple in-memory rate limiting (in production, use Redis)
  const now = Date.now();
  const windowMs = 60 * 1000; // 1 minute
  const maxRequests = 10; // 10 requests per minute per user

  if (!global.voiceRateLimit) {
    global.voiceRateLimit = new Map();
  }

  const userKey = `voice_${userId}`;
  const userRequests = global.voiceRateLimit.get(userKey) || [];
  
  // Remove old requests outside the window
  const validRequests = userRequests.filter(timestamp => now - timestamp < windowMs);
  
  if (validRequests.length >= maxRequests) {
    return res.status(429).json({
      success: false,
      message: 'Too many voice requests. Please wait before trying again.',
      error: 'RATE_LIMIT_EXCEEDED',
      retryAfter: Math.ceil((validRequests[0] + windowMs - now) / 1000)
    });
  }

  // Add current request
  validRequests.push(now);
  global.voiceRateLimit.set(userKey, validRequests);
  
  next();
};

// Error handler for voice processing routes
const voiceErrorHandler = (error, req, res, next) => {
  console.error('Voice processing error:', error);

  // Multer errors
  if (error.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({
      success: false,
      message: 'File size exceeds maximum limit',
      error: 'FILE_TOO_LARGE'
    });
  }

  if (error.code === 'LIMIT_UNEXPECTED_FILE') {
    return res.status(400).json({
      success: false,
      message: 'Unexpected file field',
      error: 'INVALID_FILE_FIELD'
    });
  }

  // Hugging Face API errors
  if (error.message.includes('Hugging Face')) {
    return res.status(503).json({
      success: false,
      message: 'Voice processing service temporarily unavailable',
      error: 'SERVICE_UNAVAILABLE'
    });
  }

  // MongoDB errors
  if (error.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      message: 'Database validation error',
      error: 'VALIDATION_ERROR',
      details: Object.values(error.errors).map(err => err.message)
    });
  }

  if (error.name === 'CastError') {
    return res.status(400).json({
      success: false,
      message: 'Invalid ID format',
      error: 'INVALID_ID'
    });
  }

  // Network/timeout errors
  if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
    return res.status(504).json({
      success: false,
      message: 'Request timeout. Please try again.',
      error: 'TIMEOUT'
    });
  }

  // Default error
  res.status(500).json({
    success: false,
    message: 'Internal server error',
    error: 'INTERNAL_ERROR',
    ...(process.env.NODE_ENV === 'development' && { details: error.message })
  });
};

module.exports = {
  voiceProcessingValidation,
  textMessageValidation,
  handleValidationErrors,
  validateAudioFile,
  voiceRateLimit,
  voiceErrorHandler
};
