const express = require('express');
const { login, me } = require('./auth.controller');
const authenticateJWT = require('../shared/authenticateJWT');

const router = express.Router();

// Public routes
router.post('/login', login);

// Protected routes
router.get('/me', authenticateJWT, me);

module.exports = router;
