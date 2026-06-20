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
router.patch('/wards/:ward_id/status', nursesController.toggleWardStatus);
router.put('/wards/:ward_id/bed-count', nursesController.updateBedCount);
router.delete('/wards/:ward_id', nursesController.deleteWard);

// Bed management
router.get('/wards/:ward_id/beds', nursesController.getBeds);
router.post('/wards/:ward_id/beds', nursesController.addBed);
router.put('/beds/:bed_id', nursesController.updateBed);
router.delete('/beds/:bed_id', nursesController.deleteBed);

// Emergency Obstetric Workflow
const obstetricTriageController = require('./obstetricTriage.controller');
const deliveryController = require('./deliveryRecord.controller');

router.post('/obstetric-triage/:visitId', obstetricTriageController.recordObstetricTriage);
router.get('/obstetric-pending-review', obstetricTriageController.getObstetricPendingReview);
router.post('/record-delivery/:visitId', deliveryController.recordDelivery);
router.get('/delivery/:deliveryId', deliveryController.getDeliveryDetails);
router.get('/deliveries/today', deliveryController.getTodaysDeliveries);
router.get('/visit/:visitId', nursesController.getVisit);

module.exports = router;

