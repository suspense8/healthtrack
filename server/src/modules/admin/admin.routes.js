const express = require('express');
const adminController = require('./admin.controller');
const exportController = require('./export.controller');
const authenticateJWT = require('../shared/authenticateJWT');
const authorizeRoles = require('../shared/authorizeRoles');

const router = express.Router();

// All admin routes require authentication + admin role
router.use(authenticateJWT);
router.use(authorizeRoles('admin'));

// System stats
router.get('/stats', adminController.getSystemStats);

// Analytics endpoints
router.get('/analytics/visits', adminController.getVisitAnalytics);
router.get('/analytics/patients', adminController.getPatientAnalytics);
router.get('/analytics/clinical', adminController.getClinicalAnalytics);
router.get('/analytics/staff', adminController.getStaffPerformance);

// Patient flow
router.get('/patient-flow', adminController.getPatientFlow);

// Activity logs
router.get('/logs', adminController.getActivityLogs);

// Data Export endpoints
router.get('/export/welfare', exportController.exportStudentWelfareData);
router.get('/export/summary', exportController.exportStudentSummary);
router.get('/export/analytics', exportController.exportVisitAnalytics);

// User management (admin only)
router.get('/users', adminController.getUsers);
router.post('/users', adminController.createUser);
router.patch('/users/:id/role', adminController.updateUserRole);
router.post('/users/:id/reset-password', adminController.resetPassword);
router.delete('/users/:id', adminController.deleteUser);

module.exports = router;
