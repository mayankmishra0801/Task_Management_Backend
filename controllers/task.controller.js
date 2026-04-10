const taskService = require('../services/task.service');

const getTasks = async (req, res) => {
  try {
    const tasks = await taskService.getTasks(req.user);
    res.json(tasks);
  } catch (error) {
    const statusCode = error.statusCode || 500;
    res.status(statusCode).json({ message: statusCode === 500 ? 'Server error' : error.message, error: error.message });
  }
};

const createTask = async (req, res) => {
  try {
    const task = await taskService.createTask(req.user, req.body);
    res.status(201).json(task);
  } catch (error) {
    const statusCode = error.statusCode || 500;
    res.status(statusCode).json({ message: statusCode === 500 ? 'Server error' : error.message, error: error.message });
  }
};

const updateTask = async (req, res) => {
  try {
    const task = await taskService.updateTask(req.params.id, req.user, req.body);
    res.json(task);
  } catch (error) {
    const statusCode = error.statusCode || 500;
    res.status(statusCode).json({ message: statusCode === 500 ? 'Server error' : error.message, error: error.message });
  }
};

const deleteTask = async (req, res) => {
  try {
    await taskService.deleteTask(req.params.id, req.user);
    res.json({ message: 'Task removed' });
  } catch (error) {
    const statusCode = error.statusCode || 500;
    res.status(statusCode).json({ message: statusCode === 500 ? 'Server error' : error.message, error: error.message });
  }
};

module.exports = {
  getTasks,
  createTask,
  updateTask,
  deleteTask
};
