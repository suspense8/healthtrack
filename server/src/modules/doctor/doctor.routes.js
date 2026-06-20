const express = require('express');
const router = express.Router();
const doctorController = require('./doctor.controller');
const authenticateJWT = require('../shared/authenticateJWT');
const authorizeRoles = require('../shared/authorizeRoles');

router.use(authenticateJWT);
router.use(authorizeRoles('admin', 'doctor'));

router.get('/queue', doctorController.getQueue);
router.get('/visits/:visitId', doctorController.getVisit);
router.post('/consultation', doctorController.submitConsultation);
router.get('/patients/search', doctorController.searchPatients);
router.get('/patients/:patientId/history', doctorController.getPatientHistory);
router.get('/patients/:patientId/last-visit', doctorController.getLastVisit);
router.get('/patients/:patientId', doctorController.getPatient);
router.get('/appointments', doctorController.getAppointments);
router.post('/appointments', doctorController.createAppointment);
router.get('/stats', doctorController.getDoctorStats);
router.post('/appointments/complete', doctorController.completeAppointment);
router.get('/prescriptions', doctorController.getPrescriptions);

// Disease search (vector-based)
router.post('/search-diseases', doctorController.searchDiseases);
router.get('/diseases/autocomplete', doctorController.autocompleteDiseases);
router.get('/diseases/:id', doctorController.getDiseaseById);

// Medicine search (vector-based)
router.post('/search-medicines', doctorController.searchMedicines);
router.get('/medicines/autocomplete', doctorController.autocompleteMedicines);
router.get('/medicines/:id', doctorController.getMedicineById);

// Emergency Obstetric Workflow
const obstetricReviewController = require('./obstetricReview.controller');

router.post('/obstetric-review/:visitId', obstetricReviewController.obstetricReview);
router.post('/partograph/:visitId', obstetricReviewController.addPartographEntry);
router.get('/partograph/:visitId', obstetricReviewController.getPartographData);

module.exports = router;

