const Task = require('../models/Task');
const User = require('../models/User');

const getTasks = async (user) => {
  const userRole = user.role;
  let filter = {};

  if (userRole === 'Employee') {
    filter.assignedTo = user._id;
  } else if (userRole === 'Team Lead') {
    const teamMembers = await User.find({ reportsTo: user._id }).select('_id');
    const teamMemberIds = teamMembers.map(member => member._id);
    
    filter.assignedTo = { $in: [user._id, ...teamMemberIds] };
  } 

  return await Task.find(filter)
    .populate('assignedTo', 'username email role')
    .populate('createdBy', 'username email role')
    .sort({ createdAt: -1 });
};

const createTask = async (user, taskData) => {
  const { title, description, assignedTo } = taskData;
  
  if (!title || !description) {
    const error = new Error('Please provide title and description');
    error.statusCode = 400;
    throw error;
  }

  let finalAssignedTo = user._id;

  if (user.role === 'Employee') {
    finalAssignedTo = user._id;
  } else if (user.role === 'Team Lead') {
    if (assignedTo && assignedTo !== user._id.toString()) {
      const targetUser = await User.findById(assignedTo);
      if (targetUser && targetUser.reportsTo && targetUser.reportsTo.toString() === user._id.toString()) {
        finalAssignedTo = assignedTo;
      } else {
         const error = new Error('You can only assign tasks to your team members or yourself');
         error.statusCode = 403;
         throw error;
      }
    }
  } else if (user.role === 'Manager') {
    if (assignedTo) {
      finalAssignedTo = assignedTo;
    }
  }

  const task = await Task.create({
    title,
    description,
    createdBy: user._id,
    assignedTo: finalAssignedTo
  });

  return await Task.findById(task._id)
    .populate('assignedTo', 'username email')
    .populate('createdBy', 'username email');
};

const updateTask = async (taskId, user, updateDataBody) => {
  const task = await Task.findById(taskId);

  if (!task) {
    const error = new Error('Task not found');
    error.statusCode = 404;
    throw error;
  }

  const userRole = user.role;
  const isOwner = task.createdBy.toString() === user._id.toString();
  const isAssigned = task.assignedTo.toString() === user._id.toString();

  let canEdit = false;

  if (userRole === 'Manager') {
    canEdit = true;
  } else if (userRole === 'Team Lead') {
    if (isOwner || isAssigned) {
      canEdit = true;
    } else {
      const assignedUser = await User.findById(task.assignedTo);
      if (assignedUser && assignedUser.reportsTo && assignedUser.reportsTo.toString() === user._id.toString()) {
        canEdit = true;
      }
    }
  } else if (userRole === 'Employee') {
    if (isOwner || isAssigned) {
      canEdit = true;
    }
  }

  if (!canEdit) {
    const error = new Error('Not authorized to modify this task');
    error.statusCode = 403;
    throw error;
  }

  const updateData = {
    title: updateDataBody.title || task.title,
    description: updateDataBody.description || task.description,
    status: updateDataBody.status || task.status
  };

  if (updateDataBody.assignedTo && updateDataBody.assignedTo !== task.assignedTo.toString()) {
      if (userRole === 'Employee') {
           const error = new Error('Employees cannot reassign tasks');
           error.statusCode = 403;
           throw error;
      } else if (userRole === 'Team Lead') {
          const targetUser = await User.findById(updateDataBody.assignedTo);
          if (!targetUser || !targetUser.reportsTo || targetUser.reportsTo.toString() !== user._id.toString()) {
              if(updateDataBody.assignedTo !== user._id.toString()) {
                 const error = new Error('You can only assign tasks to your team members or yourself');
                 error.statusCode = 403;
                 throw error;
              }
          }
          updateData.assignedTo = updateDataBody.assignedTo;
      } else if (userRole === 'Manager') {
          updateData.assignedTo = updateDataBody.assignedTo;
      }
  }

  return await Task.findByIdAndUpdate(
    taskId,
    updateData,
    { new: true }
  ).populate('assignedTo', 'username email').populate('createdBy', 'username email');
};

const deleteTask = async (taskId, user) => {
  const task = await Task.findById(taskId);

  if (!task) {
    const error = new Error('Task not found');
    error.statusCode = 404;
    throw error;
  }

  const userRole = user.role;
  const isOwner = task.createdBy.toString() === user._id.toString();
  const isAssigned = task.assignedTo.toString() === user._id.toString();

  let canDelete = false;

  if (userRole === 'Manager') {
    canDelete = true;
  } else if (userRole === 'Team Lead') {
    if (isOwner || isAssigned) {
      canDelete = true;
    } else {
      const assignedUser = await User.findById(task.assignedTo);
      if (assignedUser && assignedUser.reportsTo && assignedUser.reportsTo.toString() === user._id.toString()) {
        canDelete = true;
      }
    }
  } else if (userRole === 'Employee') {
    if (isOwner || isAssigned) {
      canDelete = true;
    }
  }

  if (!canDelete) {
    const error = new Error('Not authorized to delete this task');
    error.statusCode = 403;
    throw error;
  }

  await Task.findByIdAndDelete(taskId);
};

module.exports = {
  getTasks,
  createTask,
  updateTask,
  deleteTask
};
