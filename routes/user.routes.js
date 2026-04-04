const express = require('express');
const User = require('../models/User');
const { protect, authorize } = require('../middleware/auth');
const router = express.Router();

// @route   GET /api/users/team-leads
// @desc    Get list of team leads (mainly for Managers or registration dropdowns)
router.get('/team-leads', async (req, res) => {
  try {
    const teamLeads = await User.find({ role: 'Team Lead' }).select('_id username email');
    res.json(teamLeads);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

router.use(protect);

// @route   GET /api/users
// @desc    Get assignable users based on role
router.get('/', authorize('Manager', 'Team Lead'), async (req, res) => {
  try {
    const userRole = req.user.role;
    let filter = {}; // default for Manager, retrieves everything

    if (userRole === 'Team Lead') {
      // Team lead only gets themselves and their direct reports
      filter = {
        $or: [
          { _id: req.user._id },
          { reportsTo: req.user._id }
        ]
      };
    }
    
    // Also return users who might be Team Leads if the current user is Manager.
    // Let's just return what matches the filter.
    const users = await User.find(filter).select('-password');
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});


module.exports = router;
