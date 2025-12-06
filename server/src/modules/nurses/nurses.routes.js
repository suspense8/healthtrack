const express = require('express');
const router = express.Router();
const nursesController = require('./nurses.controller');
const authenticateJWT = require('../shared/authenticateJWT');
const authorizeRoles = require('../shared/authorizeRoles');

router.use(express.json());
router.use(authenticateJWT);
router.use(authorizeRoles('admin', 'nurse'));

router.get('/queue', nursesController.getQueue);
router.post('/vitals', nursesController.updateVitals);

module.exports = router;
