const User = require('../models/User');

const getTeamLeads = async () => {
  return await User.find({ role: 'Team Lead' }).select('_id username email');
};

const getUsers = async (user) => {
  const userRole = user.role;
  let filter = {}; // default for Manager, retrieves everything

  if (userRole === 'Team Lead') {
    // Team lead only gets themselves and their direct reports
    filter = {
      $or: [
        { _id: user._id },
        { reportsTo: user._id }
      ]
    };
  }
  
  // Also return users who might be Team Leads if the current user is Manager.

  return await User.find(filter).select('-password');
};

module.exports = {
  getTeamLeads,
  getUsers
};
