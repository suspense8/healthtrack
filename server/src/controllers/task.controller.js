const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const TaskManager = require('../services/taskManager');

/**
 * Get Tasks for Current User's Role
 * GET /api/tasks/my-tasks
 */
const getMyTasks = async (req, res) => {
  const { role } = req.user;

  try {
    const tasks = await TaskManager.getPendingTasksForRole(role);
    res.json(tasks);
  } catch (error) {
    console.error('Get tasks error:', error);
    res.status(500).json({ error: 'Failed to fetch tasks' });
  }
};

/**
 * Get All Tasks (Admin only)
 * GET /api/tasks/all
 */
const getAllTasks = async (req, res) => {
  try {
    const tasks = await prisma.task.findMany({
      where: {
        status: { in: ['pending', 'in_progress'] }
      },
      include: {
        visit: {
          include: {
            patient: {
              select: {
                first_name: true,
                last_name: true
              }
            }
          }
        }
      },
      orderBy: [
        { priority: 'desc' },
        { created_at: 'asc' }
      ]
    });

    res.json(tasks);
  } catch (error) {
    console.error('Get all tasks error:', error);
    res.status(500).json({ error: 'Failed to fetch all tasks' });
  }
};

/**
 * Start Task
 * PATCH /api/tasks/:taskId/start
 */
const startTask = async (req, res) => {
  const { taskId } = req.params;

  try {
    const task = await TaskManager.startTask(parseInt(taskId), req.user.userId);
    res.json(task);
  } catch (error) {
    console.error('Start task error:', error);
    res.status(500).json({ error: 'Failed to start task' });
  }
};

/**
 * Complete Task
 * PATCH /api/tasks/:taskId/complete
 */
const completeTask = async (req, res) => {
  const { taskId } = req.params;
  const { notes } = req.body;

  try {
    const task = await TaskManager.completeTask(parseInt(taskId), req.user.userId, notes);
    res.json(task);
  } catch (error) {
    console.error('Complete task error:', error);
    res.status(500).json({ error: 'Failed to complete task' });
  }
};

/**
 * Get Overdue Tasks
 * GET /api/tasks/overdue
 */
const getOverdueTasks = async (req, res) => {
  try {
    const tasks = await TaskManager.getOverdueTasks();
    res.json(tasks);
  } catch (error) {
    console.error('Get overdue tasks error:', error);
    res.status(500).json({ error: 'Failed to fetch overdue tasks' });
  }
};

/**
 * Get Task Statistics
 * GET /api/tasks/stats
 */
const getTaskStats = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [pending, inProgress, completedToday, overdue] = await Promise.all([
      prisma.task.count({ where: { status: 'pending' } }),
      prisma.task.count({ where: { status: 'in_progress' } }),
      prisma.task.count({
        where: {
          status: 'completed',
          completed_at: { gte: today }
        }
      }),
      prisma.task.count({
        where: {
          status: 'pending',
          due_at: { lt: new Date() }
        }
      })
    ]);

    res.json({
      pending,
      in_progress: inProgress,
      completed_today: completedToday,
      overdue
    });
  } catch (error) {
    console.error('Get task stats error:', error);
    res.status(500).json({ error: 'Failed to fetch task statistics' });
  }
};

module.exports = {
  getMyTasks,
  getAllTasks,
  startTask,
  completeTask,
  getOverdueTasks,
  getTaskStats
};
