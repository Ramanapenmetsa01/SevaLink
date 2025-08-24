const express = require('express');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const auth = require('../middleware/auth');
const { sendOTPEmail, sendWelcomeEmail, testEmailConfig } = require('../utils/emailService');

const router = express.Router();

// Generate JWT token
const generateToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_SECRET || 'fallback-secret', {
    expiresIn: '7d'
  });
};

// @route   POST /api/auth/register
// @desc    Register a new user
// @access  Public
router.post('/register', [
  body('name')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Name must be between 2 and 100 characters'),
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please enter a valid email'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters'),
  body('phone')
    .matches(/^[0-9]{10}$/)
    .withMessage('Please enter a valid 10-digit phone number'),
  body('role')
    .optional()
    .isIn(['citizen', 'volunteer'])
    .withMessage('Role must be either citizen or volunteer'),
  body('volunteerKey')
    .if(body('role').equals('volunteer'))
    .notEmpty()
    .withMessage('Volunteer access key is required for volunteer registration')
    .isLength({ min: 8 })
    .withMessage('Volunteer access key must be at least 8 characters')
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

    const { name, email, password, phone, role = 'citizen', address, volunteerKey } = req.body;

    // Validate volunteer key if role is volunteer
    if (role === 'volunteer') {
      const validVolunteerKeys = [
        'VOLUNTEER2025',
        'SEVALINK_VOL',
        'COMMUNITY_HELPER',
        'VOLUNTEER_ACCESS'
      ];

      if (!volunteerKey || !validVolunteerKeys.includes(volunteerKey.toUpperCase())) {
        return res.status(400).json({
          message: 'Invalid volunteer access key. Please contact your organization administrator.'
        });
      }
    }

    // Check if user already exists
    const existingUser = await User.findOne({
      $or: [{ email }, { phone }]
    });

    if (existingUser) {
      return res.status(400).json({
        message: existingUser.email === email
          ? 'User with this email already exists'
          : 'User with this phone number already exists'
      });
    }

    // Create new user
    const user = new User({
      name,
      email,
      password,
      phone,
      role,
      address: address || {
        street: '',
        city: '',
        state: '',
        pincode: '',
        coordinates: null
      }
    });

    await user.save();

    // Generate token
    const token = generateToken(user._id);

    // Send welcome email
    const emailResult = await sendWelcomeEmail(email, name);
    if (!emailResult.success) {
      console.error('Failed to send welcome email:', emailResult.error);
      // Continue with registration even if email fails
    }

    // Return user data (without password)
    const userData = user.getPublicProfile();

    res.status(201).json({
      message: 'User registered successfully',
      token,
      user: userData
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      message: 'Server error during registration',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// @route   POST /api/auth/login
// @desc    Login user
// @access  Public
router.post('/login', [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please enter a valid email'),
  body('password')
    .notEmpty()
    .withMessage('Password is required')
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

    const { email, password } = req.body;

    // Find user by email
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({
        message: 'Invalid credentials'
      });
    }

    // Check if user is active
    if (!user.isActive) {
      return res.status(400).json({
        message: 'Account has been deactivated. Please contact support.'
      });
    }

    // Check password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(400).json({
        message: 'Invalid credentials'
      });
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    // Generate token
    const token = generateToken(user._id);

    // Return user data (without password)
    const userData = user.getPublicProfile();

    // Debug logging
    console.log('Login successful for user:', userData.email, 'Role:', userData.role);

    res.json({
      message: 'Login successful',
      token,
      user: userData
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      message: 'Server error during login',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// @route   GET /api/auth/profile
// @desc    Get current user profile
// @access  Private
router.get('/profile', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({
        message: 'User not found'
      });
    }

    const userData = user.getPublicProfile();
    res.json({
      user: userData
    });

  } catch (error) {
    console.error('Profile fetch error:', error);
    res.status(500).json({
      message: 'Server error fetching profile',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// @route   PUT /api/auth/profile
// @desc    Update user profile
// @access  Private
router.put('/profile', [
  auth,
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Name must be between 2 and 100 characters'),
  body('phone')
    .optional()
    .matches(/^[0-9]{10}$/)
    .withMessage('Please enter a valid 10-digit phone number')
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
    if (!user) {
      return res.status(404).json({
        message: 'User not found'
      });
    }

    // Update allowed fields
    const allowedUpdates = ['name', 'phone', 'address', 'preferences', 'volunteerInfo'];
    const updates = {};

    allowedUpdates.forEach(field => {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    });

    // Check if phone number is already taken by another user
    if (updates.phone && updates.phone !== user.phone) {
      const existingUser = await User.findOne({ 
        phone: updates.phone, 
        _id: { $ne: user._id } 
      });
      if (existingUser) {
        return res.status(400).json({
          message: 'Phone number is already in use'
        });
      }
    }

    Object.assign(user, updates);
    await user.save();

    const userData = user.getPublicProfile();
    res.json({
      message: 'Profile updated successfully',
      user: userData
    });

  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({
      message: 'Server error updating profile',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// @route   POST /api/auth/forgot-password
// @desc    Send OTP for password reset
// @access  Public
router.post('/forgot-password', [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please enter a valid email')
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

    const { email } = req.body;

    // Check if user exists
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({
        message: 'No account found with this email address'
      });
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // Set OTP expiry (10 minutes from now)
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000);

    // Save OTP to user document
    user.resetPasswordOTP = otp;
    user.resetPasswordOTPExpiry = otpExpiry;
    await user.save();

    // Send OTP via email
    console.log(`🔢 Generated OTP for ${email}: ${otp}`);
    let emailSent = false;
    let emailError = null;

    try {
      console.log('📧 Attempting to send OTP email...');
      const emailResult = await sendOTPEmail(email, otp, user.name);
      emailSent = emailResult.success;

      if (emailResult.success) {
        console.log('✅ OTP email sent successfully!');
      } else {
        console.error('❌ Failed to send OTP email:', emailResult.error);
        emailError = emailResult.error;
      }
    } catch (emailServiceError) {
      console.error('💥 Email service error:', emailServiceError.message);
      emailError = emailServiceError.message;
    }

    // Always return success for security, but provide different messages
    const responseMessage = emailSent
      ? 'OTP sent successfully to your email address'
      : 'OTP generated successfully. Check server console for development testing.';

    res.json({
      message: responseMessage,
      emailSent,
      // In development, always include OTP for testing
      ...(process.env.NODE_ENV === 'development' && {
        otp,
        emailError: emailError || 'No email error',
        debugInfo: {
          userFound: true,
          otpGenerated: true,
          emailAttempted: true
        }
      })
    });

  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({
      message: 'Server error sending OTP',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// @route   POST /api/auth/verify-otp
// @desc    Verify OTP for password reset
// @access  Public
router.post('/verify-otp', [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please enter a valid email'),
  body('otp')
    .isLength({ min: 6, max: 6 })
    .withMessage('OTP must be 6 digits')
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

    const { email, otp } = req.body;

    // Find user with matching email and OTP
    const user = await User.findOne({
      email,
      resetPasswordOTP: otp,
      resetPasswordOTPExpiry: { $gt: new Date() }
    });

    if (!user) {
      return res.status(400).json({
        message: 'Invalid or expired OTP'
      });
    }

    res.json({
      message: 'OTP verified successfully'
    });

  } catch (error) {
    console.error('OTP verification error:', error);
    res.status(500).json({
      message: 'Server error verifying OTP',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// @route   POST /api/auth/reset-password
// @desc    Reset password with OTP
// @access  Public
router.post('/reset-password', [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please enter a valid email'),
  body('otp')
    .isLength({ min: 6, max: 6 })
    .withMessage('OTP must be 6 digits'),
  body('newPassword')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters')
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

    const { email, otp, newPassword } = req.body;

    // Find user with matching email and OTP
    const user = await User.findOne({
      email,
      resetPasswordOTP: otp,
      resetPasswordOTPExpiry: { $gt: new Date() }
    });

    if (!user) {
      return res.status(400).json({
        message: 'Invalid or expired OTP'
      });
    }

    // Update password
    user.password = newPassword; // This will be hashed by the pre-save middleware
    user.resetPasswordOTP = undefined;
    user.resetPasswordOTPExpiry = undefined;
    await user.save();

    res.json({
      message: 'Password reset successfully'
    });

  } catch (error) {
    console.error('Password reset error:', error);
    res.status(500).json({
      message: 'Server error resetting password',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// @route   GET /api/auth/test-email
// @desc    Test email configuration
// @access  Public (for development only)
router.get('/test-email', async (req, res) => {
  try {
    if (process.env.NODE_ENV === 'production') {
      return res.status(403).json({
        message: 'This endpoint is only available in development mode'
      });
    }

    console.log('Testing email configuration...');
    console.log('EMAIL_USER:', process.env.EMAIL_USER);
    console.log('EMAIL_PASS configured:', !!process.env.EMAIL_PASS);

    const result = await testEmailConfig();

    if (result.success) {
      // Try sending a test OTP email
      const otpResult = await sendOTPEmail(process.env.EMAIL_USER, '123456', 'Test User');

      res.json({
        message: 'Email configuration is working correctly',
        status: 'success',
        emailTest: otpResult.success ? 'OTP email sent successfully' : 'OTP email failed',
        details: otpResult
      });
    } else {
      res.status(500).json({
        message: 'Email configuration failed',
        error: result.error,
        status: 'error',
        troubleshooting: {
          step1: 'Enable 2-Factor Authentication on Gmail',
          step2: 'Generate App Password: https://myaccount.google.com/apppasswords',
          step3: 'Update EMAIL_PASS in .env with the App Password',
          step4: 'Restart the server'
        }
      });
    }

  } catch (error) {
    console.error('Email test error:', error);
    res.status(500).json({
      message: 'Failed to test email configuration',
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// @route   GET /api/auth/test-users
// @desc    List test users for development
// @access  Public (for development only)
router.get('/test-users', async (req, res) => {
  try {
    if (process.env.NODE_ENV === 'production') {
      return res.status(403).json({
        message: 'This endpoint is only available in development mode'
      });
    }

    const users = await User.find({}, 'name email role createdAt').limit(10);

    res.json({
      message: 'Test users retrieved',
      count: users.length,
      users: users.map(user => ({
        name: user.name,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt
      }))
    });

  } catch (error) {
    console.error('Test users error:', error);
    res.status(500).json({
      message: 'Failed to retrieve test users',
      error: error.message
    });
  }
});

module.exports = router;
