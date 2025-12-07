const express = require('express');
const { login, me, updateProfile, changePassword } = require('./auth.controller');
const authenticateJWT = require('../shared/authenticateJWT');

const router = express.Router();

// Public routes
router.post('/login', login);

// Protected routes
router.get('/me', authenticateJWT, me);
router.patch('/profile', authenticateJWT, updateProfile);
router.post('/change-password', authenticateJWT, changePassword);

module.exports = router;

