const userService = require('../services/user.service');

const getTeamLeads = async (req, res) => {
  try {
    const teamLeads = await userService.getTeamLeads();
    res.json(teamLeads);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const getUsers = async (req, res) => {
  try {
    const users = await userService.getUsers(req.user);
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

module.exports = {
  getTeamLeads,
  getUsers
};
