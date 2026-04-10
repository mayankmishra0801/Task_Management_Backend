const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || 'fallback_secret_temp', {
    expiresIn: '30d',
  });
};

const registerUser = async (userData) => {
  const { username, email, password, role, reportsTo } = userData;

  if (!username || !email || !password || !role) {
    const error = new Error('Please provide all required fields');
    error.statusCode = 400;
    throw error;
  }

  const userExists = await User.findOne({ email });
  if (userExists) {
    const error = new Error('User already exists with this email');
    error.statusCode = 400;
    throw error;
  }

  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(password, salt);

  const user = await User.create({
    username,
    email,
    password: hashedPassword,
    role,
    reportsTo: reportsTo || null
  });

  if (user) {
    return {
      _id: user._id,
      username: user.username,
      email: user.email,
      role: user.role,
      token: generateToken(user._id),
    };
  } else {
    const error = new Error('Invalid user data');
    error.statusCode = 400;
    throw error;
  }
};

const loginUser = async (email, password) => {
  const user = await User.findOne({ email });

  if (user && (await bcrypt.compare(password, user.password))) {
    return {
      _id: user._id,
      username: user.username,
      email: user.email,
      role: user.role,
      token: generateToken(user._id),
    };
  } else {
    const error = new Error('Invalid credentials');
    error.statusCode = 401;
    throw error;
  }
};

module.exports = {
  registerUser,
  loginUser
};
