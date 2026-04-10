const express = require('express');
const { protect, authorize } = require('../middleware/auth');
const userController = require('../controllers/user.controller');

const router = express.Router();

router.get('/team-leads', userController.getTeamLeads);

router.use(protect);

router.get('/', authorize('Manager', 'Team Lead'), userController.getUsers);

module.exports = router;
