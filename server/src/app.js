const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const { createServer } = require('http');
const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
require('dotenv').config();

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

// Initialize notification service with Socket.IO
notificationService.initialize(io);

// Socket.IO authentication middleware
io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  if (!token) {
    return next(new Error('Authentication required'));
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    socket.user = decoded;
    next();
  } catch (err) {
    next(new Error('Invalid token'));
  }
});

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log(`🔌 User connected: ${socket.user.username} (${socket.user.role})`);

  // Join role-based room
  const roleRoom = `room:${socket.user.role}`;
  socket.join(roleRoom);
  console.log(`   → Joined ${roleRoom}`);

  // Handle disconnect
  socket.on('disconnect', () => {
    console.log(`🔌 User disconnected: ${socket.user.username}`);
  });

  // Optional: Handle acknowledgment
  socket.on('notification_received', (notificationId) => {
    console.log(`✓ Notification ${notificationId} acknowledged by ${socket.user.username}`);
  });
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
const doctorRoutes = require('./modules/doctor/doctor.routes');
const adminRoutes = require('./modules/admin/admin.routes');
const pharmacyRoutes = require('./modules/pharmacy/pharmacy.routes');
const admissionRoutes = require('./modules/admission/admission.routes');

app.use('/api/auth', authRoutes);
app.use('/api/reception', receptionRoutes);
app.use('/api/nurses', nursesRoutes);
app.use('/api/doctor', doctorRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/pharmacy', pharmacyRoutes);
app.use('/api/admission', admissionRoutes);

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
  httpServer.listen(PORT, () => {
    console.log(`🏥 Server running on port ${PORT}`);
    console.log(`🔌 Socket.IO ready for connections`);
  });
}

module.exports = { app, httpServer, io };
