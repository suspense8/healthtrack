const express = require('express');
const router = express.Router();
const taskController = require('../controllers/task.controller');
const authenticateJWT = require('../modules/shared/authenticateJWT');

router.use(authenticateJWT);

// Task management routes
router.get('/my-tasks', taskController.getMyTasks);
router.get('/all', taskController.getAllTasks);
router.patch('/:taskId/start', taskController.startTask);
router.patch('/:taskId/complete', taskController.completeTask);
router.get('/overdue', taskController.getOverdueTasks);
router.get('/stats', taskController.getTaskStats);

module.exports = router;
