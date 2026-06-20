const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const twilio = require('twilio');
const crypto = require('crypto');

// Twilio Client setup (using environment variables if present, else placeholders for setup)
const accountSid = process.env.TWILIO_ACCOUNT_SID || 'AC_placeholder';
const authToken = process.env.TWILIO_AUTH_TOKEN || 'placeholder';
const twilioNumber = process.env.TWILIO_PHONE_NUMBER || '+1234567890';
const client = twilio(accountSid, authToken);

// POST /api/community/intake
// Handles the simulated phone page submission
router.post('/intake', async (req, res) => {
  try {
    const { phone_number, area, symptom, severity, consent_sms, language } = req.body;

    // 1. Resolve Patient (Fuzzy match or create new)
    let patient = await prisma.patient.findFirst({
      where: { phone_number: phone_number }
    });

    if (!patient) {
      patient = await prisma.patient.create({
        data: {
          first_name: 'Community',
          last_name: 'Patient',
          phone_number: phone_number,
          patient_type: 'Community',
          preferred_language: language || 'en',
          channel_preference: 'sms',
        }
      });
    }

    // 2. Create Community Case
    const refNum = `CC-${Date.now().toString().slice(-6)}`;
    const newCase = await prisma.communityCase.create({
      data: {
        reference_number: refNum,
        patient_id: patient.patient_id,
        phone_e164: phone_number,
        area: area || 'Unknown',
        symptom: symptom || 'Unknown',
        severity_suggested: severity || 'low',
        channel: 'simulated_phone',
        language: language || 'en',
        consent_sms: consent_sms === true,
      }
    });

    // 3. Issue Magic Link Token for Web Chat
    const token = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days validity

    await prisma.magicLinkToken.create({
      data: {
        token_hash: hashedToken,
        community_case_id: newCase.id,
        patient_id: patient.patient_id,
        expires_at: expiresAt
      }
    });

    const webLink = `${process.env.CLIENT_URL || 'http://localhost:5173'}/healthtrack/chat/${token}`;

    // 4. Send Initial Twilio SMS
    if (consent_sms && accountSid !== 'AC_placeholder') {
      const messageBody = `Hello from HealthTrack. Your case reference is ${refNum}. To continue chatting, reply to this message or click here: ${webLink}`;
      try {
        const message = await client.messages.create({
          body: messageBody,
          from: twilioNumber,
          to: phone_number
        });

        await prisma.message.create({
          data: {
            community_case_id: newCase.id,
            patient_id: patient.patient_id,
            sender_type: 'system',
            channel: 'sms',
            direction: 'outbound',
            body: messageBody,
            twilio_sid: message.sid,
            delivery_status: message.status
          }
        });
      } catch (smsErr) {
        console.error('Twilio SMS Error:', smsErr);
        // Continue even if SMS fails in dev
      }
    }

    res.status(201).json({ message: 'Intake successful', case: newCase, webLink });
  } catch (err) {
    console.error('Intake Error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/community/webhooks/twilio/incoming
router.post('/webhooks/twilio/incoming', express.urlencoded({ extended: true }), async (req, res) => {
  try {
    const { From, Body, MessageSid } = req.body;
    
    // Find active case for this phone number
    const activeCase = await prisma.communityCase.findFirst({
      where: { phone_e164: From, status: { notIn: ['resolved'] } },
      orderBy: { created_at: 'desc' }
    });

    if (activeCase) {
      const msg = await prisma.message.create({
        data: {
          community_case_id: activeCase.id,
          patient_id: activeCase.patient_id,
          sender_type: 'patient',
          channel: 'sms',
          direction: 'inbound',
          body: Body,
          twilio_sid: MessageSid,
          delivery_status: 'delivered'
        }
      });

      // Emit to socket room for nurse updates
      // Using global.io if it's set in app.js
      if (global.io) {
        global.io.to(`room:community_case_${activeCase.id}`).emit('new_message', msg);
      }
    }

    // Twilio requires empty TwiML response
    res.type('text/xml');
    res.send('<Response></Response>');
  } catch (err) {
    console.error('Twilio Incoming Error:', err);
    res.status(500).send('Error');
  }
});

// POST /api/community/webhooks/twilio/status
router.post('/webhooks/twilio/status', express.urlencoded({ extended: true }), async (req, res) => {
  try {
    const { MessageSid, MessageStatus } = req.body;

    if (MessageSid) {
      await prisma.message.updateMany({
        where: { twilio_sid: MessageSid },
        data: { delivery_status: MessageStatus }
      });
    }

    res.sendStatus(200);
  } catch (err) {
    console.error('Twilio Status Error:', err);
    res.status(500).send('Error');
  }
});

// GET /api/community/messages/:token
router.get('/messages/:token', async (req, res) => {
  try {
    const token = req.params.token;
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    const magicLink = await prisma.magicLinkToken.findUnique({
      where: { token_hash: hashedToken },
      include: { community_case: true }
    });

    if (!magicLink || magicLink.expires_at < new Date() || magicLink.revoked_at) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    const messages = await prisma.message.findMany({
      where: { community_case_id: magicLink.community_case_id },
      orderBy: { created_at: 'asc' }
    });

    res.json({ messages, case: magicLink.community_case });
  } catch (err) {
    console.error('Get Messages Error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/community/messages/:token
router.post('/messages/:token', async (req, res) => {
  try {
    const token = req.params.token;
    const { body } = req.body;
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    const magicLink = await prisma.magicLinkToken.findUnique({
      where: { token_hash: hashedToken }
    });

    if (!magicLink || magicLink.expires_at < new Date() || magicLink.revoked_at) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    const msg = await prisma.message.create({
      data: {
        community_case_id: magicLink.community_case_id,
        patient_id: magicLink.patient_id,
        sender_type: 'patient',
        channel: 'web',
        direction: 'inbound',
        body: body,
        delivery_status: 'delivered'
      }
    });

    if (global.io) {
      global.io.to(`room:community_case_${magicLink.community_case_id}`).emit('new_message', msg);
    }

    res.status(201).json(msg);
  } catch (err) {
    console.error('Post Message Error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
