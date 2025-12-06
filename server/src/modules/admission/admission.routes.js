const express = require('express');
const admissionController = require('./admission.controller');
const authenticateJWT = require('../shared/authenticateJWT');
const authorizeRoles = require('../shared/authorizeRoles');

const router = express.Router();

router.use(authenticateJWT);
router.use(authorizeRoles('admin', 'doctor', 'nurse'));

// Ward & Bed Management
router.get('/wards', admissionController.getWards);
router.get('/wards/:wardId/beds', admissionController.getWardBeds);

// Admission Requests
router.post('/request', admissionController.createAdmissionRequest);
router.get('/pending', admissionController.getPendingAdmissions);
router.patch('/:id/accept', admissionController.acceptAdmission);
router.patch('/:id/reject', admissionController.rejectAdmission);

// Admitted Patients
router.get('/admitted', admissionController.getAdmittedPatients);
router.get('/:id', admissionController.getAdmissionDetails);
router.post('/:id/notes', admissionController.addAdmissionNote);

// Discharge
router.patch('/:id/initiate-discharge', admissionController.initiateDischarge);
router.patch('/:id/confirm-discharge', admissionController.confirmDischarge);

// Stats
router.get('/stats/overview', admissionController.getAdmissionStats);

module.exports = router;
