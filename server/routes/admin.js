const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { authorize } = require('../middleware/auth');

// @route   GET /api/admin/dashboard
// @desc    Get admin dashboard data
// @access  Private (Admin only)
router.get('/dashboard', [auth, authorize('admin')], async (req, res) => {
  res.json({
    message: 'Admin dashboard endpoint - Coming soon',
    data: {
      totalUsers: 0,
      totalComplaints: 0,
      totalBloodRequests: 0,
      totalElderlySupport: 0
    }
  });
});

module.exports = router;
