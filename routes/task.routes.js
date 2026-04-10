const express = require('express');
const { protect } = require('../middleware/auth');
const taskController = require('../controllers/task.controller');
const router = express.Router();

router.use(protect);

router.get('/', taskController.getTasks);
router.post('/', taskController.createTask);
router.put('/:id', taskController.updateTask);
router.delete('/:id', taskController.deleteTask);

module.exports = router;
