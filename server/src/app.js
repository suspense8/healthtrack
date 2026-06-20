const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const { createServer } = require('http');
const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const crypto = require('crypto');

const notificationService = require('./services/notification.service');

const app = express();
const httpServer = createServer(app);

// Initialize Socket.IO with CORS
const io = new Server(httpServer, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    methods: ['GET', 'POST'],
    credentials: true
  }
});

// Expose io globally for routes to emit events
global.io = io;

// Initialize notification service with Socket.IO
notificationService.initialize(io);

// Socket.IO authentication middleware
io.use(async (socket, next) => {
  const token = socket.handshake.auth.token;
  const isPatient = socket.handshake.auth.isPatient;
  
  if (!token) {
    return next(new Error('Authentication required'));
  }

  if (isPatient) {
    // Validate magic link token
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
    try {
      const magicLink = await prisma.magicLinkToken.findUnique({
        where: { token_hash: hashedToken }
      });
      if (!magicLink || magicLink.expires_at < new Date() || magicLink.revoked_at) {
        return next(new Error('Invalid or expired magic link'));
      }
      socket.user = { isPatient: true, community_case_id: magicLink.community_case_id };
      next();
    } catch (err) {
      next(new Error('Database error'));
    }
  } else {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.user = decoded;
      next();
    } catch (err) {
      next(new Error('Invalid token'));
    }
  }
});

// Socket.IO connection handling
io.on('connection', (socket) => {
  if (socket.user.isPatient) {
    console.log(`🔌 Patient connected to case ${socket.user.community_case_id}`);
    const caseRoom = `room:community_case_${socket.user.community_case_id}`;
    socket.join(caseRoom);
    console.log(`   → Joined ${caseRoom}`);
    
    socket.on('disconnect', () => {
      console.log(`🔌 Patient disconnected from case ${socket.user.community_case_id}`);
    });
  } else {
    console.log(`🔌 User connected: ${socket.user.username} (${socket.user.role})`);

    // Join role-based room
    const roleRoom = `room:${socket.user.role}`;
    socket.join(roleRoom);
    console.log(`   → Joined ${roleRoom}`);

    // Nurses also join community_queue room to get updates
    if (socket.user.role === 'nurse') {
      socket.join('community_queue');
    }

    // Nurses can join specific case rooms when they open them
    socket.on('join_case', (caseId) => {
      if (socket.user.role === 'nurse') {
        socket.join(`room:community_case_${caseId}`);
        console.log(`   → ${socket.user.username} joined room:community_case_${caseId}`);
      }
    });
    
    socket.on('leave_case', (caseId) => {
      if (socket.user.role === 'nurse') {
        socket.leave(`room:community_case_${caseId}`);
        console.log(`   → ${socket.user.username} left room:community_case_${caseId}`);
      }
    });

    // Handle disconnect
    socket.on('disconnect', () => {
      console.log(`🔌 User disconnected: ${socket.user.username}`);
    });

    // Optional: Handle acknowledgment
    socket.on('notification_received', (notificationId) => {
      console.log(`✓ Notification ${notificationId} acknowledged by ${socket.user.username}`);
    });
  }
});

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

// Routes
const authRoutes = require('./modules/auth/auth.routes');
const receptionRoutes = require('./modules/reception/reception.routes');
const nursesRoutes = require('./modules/nurses/nurses.routes');
const nurseCommunityRoutes = require('./modules/nurses/nurse.community.routes');
const doctorRoutes = require('./modules/doctor/doctor.routes');
const adminRoutes = require('./modules/admin/admin.routes');
const pharmacyRoutes = require('./modules/pharmacy/pharmacy.routes');
const admissionRoutes = require('./modules/admission/admission.routes');
const taskRoutes = require('./routes/task.routes');
const communityRoutes = require('./modules/community/community.routes');

app.use('/api/auth', authRoutes);
app.use('/api/reception', receptionRoutes);
app.use('/api/nurses/community-cases', nurseCommunityRoutes);
app.use('/api/nurses', nursesRoutes);
app.use('/api/doctor', doctorRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/pharmacy', pharmacyRoutes);
app.use('/api/admission', admissionRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/community', communityRoutes);

app.get('/', (req, res) => {
  res.json({ message: 'Njala University Clinic Server is running' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

const PORT = process.env.PORT || 3000;

if (require.main === module) {
  const db = require('./config/database');

  db.initializeDatabase()
    .then(() => {
      httpServer.listen(PORT, () => {
        console.log(`🏥 Server running on port ${PORT}`);
        console.log(`🔌 Socket.IO ready for connections`);
      });
    })
    .catch((err) => {
      console.error('💥 Failed to initialize database:', err.message);
      process.exit(1);
    });
}

module.exports = { app, httpServer, io };
