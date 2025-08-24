const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');

// @route   GET /api/elderly-support
// @desc    Get all elderly support requests
// @access  Private
router.get('/', auth, async (req, res) => {
  res.json({
    message: 'Elderly support endpoint - Coming soon',
    data: []
  });
});

// @route   POST /api/elderly-support
// @desc    Create a new elderly support request
// @access  Private
router.post('/', auth, async (req, res) => {
  res.json({
    message: 'Create elderly support request endpoint - Coming soon'
  });
});

module.exports = router;
