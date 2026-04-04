const express = require('express');
const Task = require('../models/Task');
const User = require('../models/User');
const { protect } = require('../middleware/auth');
const router = express.Router();

// All task routes are protected
router.use(protect);

// @route   GET /api/tasks
// @desc    Get tasks based on role
router.get('/', async (req, res) => {
  try {
    const userRole = req.user.role;
    let filter = {};

    if (userRole === 'Employee') {
      filter.assignedTo = req.user._id;
    } else if (userRole === 'Team Lead') {
      // Find employees reporting to this Team Lead
      const teamMembers = await User.find({ reportsTo: req.user._id }).select('_id');
      const teamMemberIds = teamMembers.map(member => member._id);
      
      // Allow them to see their own tasks AND tasks assigned to their team
      filter.assignedTo = { $in: [req.user._id, ...teamMemberIds] };
    } 
    // Manager sees all tasks, so filter remains {}

    const tasks = await Task.find(filter)
      .populate('assignedTo', 'username email role')
      .populate('createdBy', 'username email role')
      .sort({ createdAt: -1 });
      
    res.json(tasks);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   POST /api/tasks
// @desc    Create a task
router.post('/', async (req, res) => {
  try {
    const { title, description, assignedTo } = req.body;
    
    if (!title || !description) {
      return res.status(400).json({ message: 'Please provide title and description' });
    }

    let finalAssignedTo = req.user._id;

    if (req.user.role === 'Employee') {
      // Employee created task automatically assigns to himself
      finalAssignedTo = req.user._id;
    } else if (req.user.role === 'Team Lead') {
      // Team Lead can assign to self or team member
      if (assignedTo && assignedTo !== req.user._id.toString()) {
        const targetUser = await User.findById(assignedTo);
        if (targetUser && targetUser.reportsTo && targetUser.reportsTo.toString() === req.user._id.toString()) {
          finalAssignedTo = assignedTo;
        } else {
           return res.status(403).json({ message: 'You can only assign tasks to your team members or yourself' });
        }
      }
    } else if (req.user.role === 'Manager') {
      // Manager can assign to anyone
      if (assignedTo) {
        finalAssignedTo = assignedTo;
      }
    }

    const task = await Task.create({
      title,
      description,
      createdBy: req.user._id,
      assignedTo: finalAssignedTo
    });

    const populatedTask = await Task.findById(task._id)
      .populate('assignedTo', 'username email')
      .populate('createdBy', 'username email');

    res.status(201).json(populatedTask);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   PUT /api/tasks/:id
// @desc    Update a task
router.put('/:id', async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);

    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    // Role-based authorization for update
    const userRole = req.user.role;
    const isOwner = task.createdBy.toString() === req.user._id.toString();
    const isAssigned = task.assignedTo.toString() === req.user._id.toString();

    let canEdit = false;

    if (userRole === 'Manager') {
      canEdit = true;
    } else if (userRole === 'Team Lead') {
      // Can edit own tasks or tasks assigned to their team
      if (isOwner || isAssigned) {
        canEdit = true;
      } else {
        const assignedUser = await User.findById(task.assignedTo);
        if (assignedUser && assignedUser.reportsTo && assignedUser.reportsTo.toString() === req.user._id.toString()) {
          canEdit = true;
        }
      }
    } else if (userRole === 'Employee') {
      if (isOwner || isAssigned) {
        canEdit = true;
      }
    }

    if (!canEdit) {
      return res.status(403).json({ message: 'Not authorized to modify this task' });
    }

    // Prepare update data
    const updateData = {
      title: req.body.title || task.title,
      description: req.body.description || task.description,
      status: req.body.status || task.status
    };

    // Only Managers and Team Leads can re-assign tasks
    if (req.body.assignedTo && req.body.assignedTo !== task.assignedTo.toString()) {
        if (userRole === 'Employee') {
             return res.status(403).json({ message: 'Employees cannot reassign tasks' });
        } else if (userRole === 'Team Lead') {
            const targetUser = await User.findById(req.body.assignedTo);
            if (!targetUser || !targetUser.reportsTo || targetUser.reportsTo.toString() !== req.user._id.toString()) {
                if(req.body.assignedTo !== req.user._id.toString()) {
                   return res.status(403).json({ message: 'You can only assign tasks to your team members or yourself' });
                }
            }
            updateData.assignedTo = req.body.assignedTo;
        } else if (userRole === 'Manager') {
            updateData.assignedTo = req.body.assignedTo;
        }
    }

    const updatedTask = await Task.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true }
    ).populate('assignedTo', 'username email').populate('createdBy', 'username email');

    res.json(updatedTask);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   DELETE /api/tasks/:id
// @desc    Delete a task
router.delete('/:id', async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);

    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    // Re-using the edit logic for deletion authority for simplicity, 
    // Manager has full rights, Lead has rights over team, Employee has rights over own.
    const userRole = req.user.role;
    const isOwner = task.createdBy.toString() === req.user._id.toString();
    const isAssigned = task.assignedTo.toString() === req.user._id.toString();

    let canDelete = false;

    if (userRole === 'Manager') {
      canDelete = true;
    } else if (userRole === 'Team Lead') {
      if (isOwner || isAssigned) {
        canDelete = true;
      } else {
        const assignedUser = await User.findById(task.assignedTo);
        if (assignedUser && assignedUser.reportsTo && assignedUser.reportsTo.toString() === req.user._id.toString()) {
          canDelete = true;
        }
      }
    } else if (userRole === 'Employee') {
      if (isOwner || isAssigned) {
        canDelete = true;
      }
    }

    if (!canDelete) {
      return res.status(403).json({ message: 'Not authorized to delete this task' });
    }

    await Task.findByIdAndDelete(req.params.id);
    res.json({ message: 'Task removed' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;
