const authService = require('../services/auth.service');

const register = async (req, res) => {
  try {
    const result = await authService.registerUser(req.body);
    res.status(201).json(result);
  } catch (error) {
    const statusCode = error.statusCode || 500;
    res.status(statusCode).json({ message: statusCode === 500 ? 'Server error' : error.message, error: error.message });
  }
};

const login = async (req, res) => {
  try {
    const result = await authService.loginUser(req.body.email, req.body.password);
    res.json(result);
  } catch (error) {
    const statusCode = error.statusCode || 500;
    res.status(statusCode).json({ message: statusCode === 500 ? 'Server error' : error.message, error: error.message });
  }
};

module.exports = {
  register,
  login
};
