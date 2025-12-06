const express = require('express');
const router = express.Router();
const doctorController = require('./doctor.controller');
const authenticateJWT = require('../shared/authenticateJWT');
const authorizeRoles = require('../shared/authorizeRoles');

router.use(authenticateJWT);
router.use(authorizeRoles('admin', 'doctor'));

router.get('/queue', doctorController.getQueue);
router.post('/consultation', doctorController.submitConsultation);
router.get('/patients/search', doctorController.searchPatients);
router.get('/patients/:patientId/history', doctorController.getPatientHistory);
router.get('/appointments', doctorController.getAppointments);
router.post('/appointments', doctorController.createAppointment);
router.get('/stats', doctorController.getDoctorStats);
router.get('/patients/:patientId/last-visit', doctorController.getLastVisit);
router.post('/appointments/complete', doctorController.completeAppointment);
router.get('/prescriptions', doctorController.getPrescriptions);

// Disease search (vector-based)
router.post('/search-diseases', doctorController.searchDiseases);
router.get('/diseases/:id', doctorController.getDiseaseById);

module.exports = router;

