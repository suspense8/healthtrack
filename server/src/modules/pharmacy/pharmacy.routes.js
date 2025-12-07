const express = require('express');
const pharmacyController = require('./pharmacy.controller');
const authenticateJWT = require('../shared/authenticateJWT');
const authorizeRoles = require('../shared/authorizeRoles');

const router = express.Router();

router.use(authenticateJWT);
router.use(authorizeRoles('admin', 'pharmacist'));

router.get('/stats', pharmacyController.getPharmacyStats);
router.get('/queue', pharmacyController.getPendingPrescriptions);
router.get('/prescriptions', pharmacyController.getAllPrescriptions);
router.get('/patients/:patientId/prescriptions', pharmacyController.getPatientPrescriptions);

router.patch('/prescriptions/:id/dispense', pharmacyController.dispensePrescription);
router.patch('/prescriptions/:id/stockout', pharmacyController.markStockout);
router.patch('/prescriptions/:id/cancel', pharmacyController.cancelPrescription);

// Medicine search (vector-based)
router.post('/search-medicines', pharmacyController.searchMedicines);
router.get('/medicines/autocomplete', pharmacyController.autocompleteMedicines);
router.get('/medicines/:id', pharmacyController.getMedicineById);

// Inventory management
router.get('/inventory', pharmacyController.getAllMedicines);
router.get('/inventory/stats', pharmacyController.getInventoryStats);
router.patch('/inventory/:id', pharmacyController.updateInventory);
router.post('/inventory/bulk', pharmacyController.bulkUpdateInventory);

module.exports = router;
