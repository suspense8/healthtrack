const express = require('express');
const { 
  createPatient, 
  searchPatients, 
  getPatient,
  updatePatient,
  verifyPatient,
  checkIn, 
  getQueue,
  updateVisitStatus,
  getAttendanceRecords,
  syncOfflineActions,
  getAppointmentsForToday
} = require('./reception.controller');
const {
  registerEmergencyObstetric,
  getEmergencyObstetricQueue
} = require('../../controllers/emergencyObstetric.controller');
const authenticateJWT = require('../shared/authenticateJWT');
const authorizeRoles = require('../shared/authorizeRoles');

const router = express.Router();

router.use(authenticateJWT);
router.use(authorizeRoles('admin', 'receptionist'));

// Request validation middleware
const validateRequestBody = (req, res, next) => {
  if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
    if (!req.body || Object.keys(req.body).length === 0) {
      return res.status(400).json({ error: 'Request body is required' });
    }
  }
  next();
};

router.use(validateRequestBody);

router.post('/patients', createPatient);
router.get('/patients', searchPatients);
router.get('/patients/:id', getPatient);
router.put('/patients/:id', updatePatient);
router.put('/patients/:id/verify', verifyPatient);

router.post('/checkin', checkIn);
router.get('/queue', getQueue);
router.get('/appointments/today', getAppointmentsForToday);
router.patch('/visits/:id/status', updateVisitStatus);
router.get('/attendance-records', getAttendanceRecords);

router.post('/sync', syncOfflineActions);

// Emergency Obstetric
router.post('/register-emergency-obstetric', registerEmergencyObstetric);
router.get('/emergency-obstetric-queue', getEmergencyObstetricQueue);

module.exports = router;
