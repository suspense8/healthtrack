const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
require('dotenv').config();

const app = express();

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
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

module.exports = app;
