const express = require('express');
const router = express.Router();
const nursesController = require('./nurses.controller');
const authenticateJWT = require('../shared/authenticateJWT');
const authorizeRoles = require('../shared/authorizeRoles');

router.use(express.json());
router.use(authenticateJWT);
router.use(authorizeRoles('admin', 'nurse'));

router.get('/queue', nursesController.getQueue);
router.get('/visits/:visitId', nursesController.getVisit);
router.post('/vitals', nursesController.updateVitals);

// Patient management
router.get('/patients/search', nursesController.searchPatients);
router.get('/patients/:patientId/history', nursesController.getPatientHistory);
router.get('/patients/:patientId', nursesController.getPatient);

// Ward management
router.get('/wards', nursesController.getWards);
router.post('/wards', nursesController.createWard);
router.put('/wards/:ward_id', nursesController.updateWard);

// Bed management
router.get('/wards/:ward_id/beds', nursesController.getBeds);
router.post('/wards/:ward_id/beds', nursesController.addBed);
router.put('/beds/:bed_id', nursesController.updateBed);
router.delete('/beds/:bed_id', nursesController.deleteBed);

module.exports = router;

