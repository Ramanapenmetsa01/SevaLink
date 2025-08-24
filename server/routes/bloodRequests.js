const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');

// @route   GET /api/blood-requests
// @desc    Get all blood requests
// @access  Private
router.get('/', auth, async (req, res) => {
  res.json({
    message: 'Blood requests endpoint - Coming soon',
    data: []
  });
});

// @route   POST /api/blood-requests
// @desc    Create a new blood request
// @access  Private
router.post('/', auth, async (req, res) => {
  res.json({
    message: 'Create blood request endpoint - Coming soon'
  });
});

module.exports = router;
