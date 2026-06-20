const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const twilio = require('twilio');

// Twilio Client setup
const accountSid = process.env.TWILIO_ACCOUNT_SID || 'AC_placeholder';
const authToken = process.env.TWILIO_AUTH_TOKEN || 'placeholder';
const twilioNumber = process.env.TWILIO_PHONE_NUMBER || '+1234567890';
const client = twilio(accountSid, authToken);

const authenticateJWT = require('../shared/authenticateJWT');
const authorizeRoles = require('../shared/authorizeRoles');

// Middleware to protect routes
router.use(authenticateJWT);
router.use(authorizeRoles('admin', 'nurse'));
// GET /api/nurses/community-cases
// Get active community cases queue
router.get('/', async (req, res) => {
  try {
    const cases = await prisma.communityCase.findMany({
      where: { status: { notIn: ['resolved', 'promoted', 'referred'] } },
      include: {
        patient: true,
        assigned_nurse: { select: { name: true, user_id: true } }
      },
      orderBy: [
        { severity_suggested: 'asc' }, // Will need proper sorting for urgent/high/medium/low
        { created_at: 'desc' }
      ]
    });
    res.json(cases);
  } catch (err) {
    console.error('Get Community Cases Error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/nurses/community-cases/:id
router.get('/:id', async (req, res) => {
  try {
    const cc = await prisma.communityCase.findUnique({
      where: { id: parseInt(req.params.id) },
      include: {
        patient: true,
        assigned_nurse: { select: { name: true, user_id: true } },
        messages: { orderBy: { created_at: 'asc' } }
      }
    });
    if (!cc) return res.status(404).json({ error: 'Not found' });
    res.json(cc);
  } catch (err) {
    console.error('Get Case Error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/nurses/community-cases/:id/claim
router.post('/:id/claim', async (req, res) => {
  try {
    const nurseId = req.user?.userId || req.user?.user_id; // Assuming req.user is set by auth middleware
    if (!nurseId) return res.status(401).json({ error: 'Unauthorized' });

    const updatedCase = await prisma.communityCase.update({
      where: { id: parseInt(req.params.id) },
      data: {
        status: 'claimed',
        assigned_nurse_id: nurseId
      },
      include: { patient: true, assigned_nurse: true }
    });
    
    if (global.io) {
      global.io.emit('community_case_updated', updatedCase);
    }

    res.json(updatedCase);
  } catch (err) {
    console.error('Claim Case Error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/nurses/community-cases/:id/messages
router.post('/:id/messages', async (req, res) => {
  try {
    const { body } = req.body;
    const nurseId = req.user?.userId || req.user?.user_id;
    const caseId = parseInt(req.params.id);

    const cc = await prisma.communityCase.findUnique({ where: { id: caseId } });
    if (!cc) return res.status(404).json({ error: 'Not found' });

    // 1. Send SMS via Twilio
    let twilioSid = null;
    let deliveryStatus = null;
    if (cc.consent_sms && accountSid !== 'AC_placeholder') {
      try {
        const message = await client.messages.create({
          body: body,
          from: twilioNumber,
          to: cc.phone_e164
        });
        twilioSid = message.sid;
        deliveryStatus = message.status;
      } catch (smsErr) {
        console.error('Twilio SMS Error:', smsErr);
      }
    }

    // 2. Save Message
    const msg = await prisma.message.create({
      data: {
        community_case_id: caseId,
        patient_id: cc.patient_id,
        sender_type: 'nurse',
        sender_user_id: nurseId,
        channel: 'sms',
        direction: 'outbound',
        body: body,
        twilio_sid: twilioSid,
        delivery_status: deliveryStatus
      }
    });

    if (global.io) {
      global.io.to(`room:community_case_${caseId}`).emit('new_message', msg);
    }

    res.status(201).json(msg);
  } catch (err) {
    console.error('Post Message Error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/nurses/community-cases/:id/promote
router.post('/:id/promote', async (req, res) => {
  try {
    const caseId = parseInt(req.params.id);
    const cc = await prisma.communityCase.findUnique({ where: { id: caseId } });
    if (!cc) return res.status(404).json({ error: 'Not found' });

    // Create an AttendanceLog for in-person visit
    const visit = await prisma.attendanceLog.create({
      data: {
        patient_id: cc.patient_id,
        visit_reason: cc.symptom,
        visit_type: 'Walk-in',
        queue_number: Math.floor(Math.random() * 100) + 1, // simplified queue number
        queue_status: 'Waiting',
        channel: 'simulated_phone',
        community_case_id: cc.id
      }
    });

    // Mark case as promoted
    const updatedCase = await prisma.communityCase.update({
      where: { id: caseId },
      data: { status: 'promoted' }
    });

    if (global.io) {
      global.io.emit('community_case_updated', updatedCase);
      global.io.emit('new_patient_queue', visit);
    }

    res.json({ message: 'Case promoted to in-person visit', visit, updatedCase });
  } catch (err) {
    console.error('Promote Case Error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
