const prisma = require('../../config/database');
const { logAction } = require('../shared/auditLogger');

// Get pending prescriptions for pharmacy queue
const getPendingPrescriptions = async (req, res) => {
  try {
    const prescriptions = await prisma.prescription.findMany({
      where: {
        status: 'Pending'
      },
      include: {
        patient: {
          select: {
            patient_id: true,
            first_name: true,
            last_name: true,
            phone_number: true,
            date_of_birth: true,
            allergies: true
          }
        },
        visit: {
          select: {
            visit_id: true,
            visit_date: true,
            diagnosis: true,
            queue_number: true
          }
        }
      },
      orderBy: { created_at: 'asc' }
    });
    res.json(prescriptions);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch pending prescriptions' });
  }
};

// Get all prescriptions with filters
const getAllPrescriptions = async (req, res) => {
  const { status, date } = req.query;
  const where = {};

  if (status && status !== 'all') {
    where.status = status;
  }

  if (date) {
    const startDate = new Date(date);
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(date);
    endDate.setHours(23, 59, 59, 999);
    where.created_at = { gte: startDate, lte: endDate };
  }

  try {
    const prescriptions = await prisma.prescription.findMany({
      where,
      include: {
        patient: {
          select: {
            patient_id: true,
            first_name: true,
            last_name: true,
            phone_number: true
          }
        },
        visit: {
          select: {
            visit_id: true,
            visit_date: true,
            diagnosis: true
          }
        }
      },
      orderBy: { created_at: 'desc' }
    });
    res.json(prescriptions);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch prescriptions' });
  }
};

// Dispense a prescription
const dispensePrescription = async (req, res) => {
  const { id } = req.params;
  const { quantity_dispensed, notes } = req.body;

  try {
    const prescription = await prisma.prescription.update({
      where: { prescription_id: parseInt(id) },
      data: {
        status: 'Dispensed',
        quantity: quantity_dispensed || null,
        pharmacist_id: req.user.userId
      }
    });

    // Check if all prescriptions for this visit are dispensed
    const remainingPending = await prisma.prescription.count({
      where: {
        visit_id: prescription.visit_id,
        status: 'Pending'
      }
    });

    // If no more pending prescriptions, update visit status to Completed
    if (remainingPending === 0) {
      await prisma.attendanceLog.update({
        where: { visit_id: prescription.visit_id },
        data: { queue_status: 'Completed' }
      });
    }

    // Log the dispense action
    await logAction({
      userId: req.user.userId,
      action: 'DISPENSE_PRESCRIPTION',
      entity: 'Prescription',
      entityId: prescription.prescription_id,
      afterSnapshot: {
        medication: prescription.medication_name,
        status: 'Dispensed',
        quantity: quantity_dispensed
      }
    });

    res.json({ message: 'Prescription dispensed', prescription });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to dispense prescription' });
  }
};

// Mark prescription as stockout
const markStockout = async (req, res) => {
  const { id } = req.params;
  const { notes } = req.body;

  try {
    const prescription = await prisma.prescription.update({
      where: { prescription_id: parseInt(id) },
      data: {
        status: 'Stockout',
        instructions: notes ? `STOCKOUT: ${notes}` : 'STOCKOUT: Medication unavailable',
        pharmacist_id: req.user.userId
      }
    });

    // Log the stockout action
    await logAction({
      userId: req.user.userId,
      action: 'MARK_STOCKOUT',
      entity: 'Prescription',
      entityId: prescription.prescription_id,
      afterSnapshot: {
        medication: prescription.medication_name,
        status: 'Stockout',
        reason: notes
      }
    });

    res.json({ message: 'Marked as stockout', prescription });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to mark stockout' });
  }
};

// Cancel prescription
const cancelPrescription = async (req, res) => {
  const { id } = req.params;
  const { reason } = req.body;

  try {
    const prescription = await prisma.prescription.update({
      where: { prescription_id: parseInt(id) },
      data: {
        status: 'Cancelled',
        instructions: reason ? `CANCELLED: ${reason}` : 'CANCELLED',
        pharmacist_id: req.user.userId
      }
    });

    // Log the cancellation
    await logAction({
      userId: req.user.userId,
      action: 'CANCEL_PRESCRIPTION',
      entity: 'Prescription',
      entityId: prescription.prescription_id,
      afterSnapshot: {
        medication: prescription.medication_name,
        status: 'Cancelled',
        reason
      }
    });

    res.json({ message: 'Prescription cancelled', prescription });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to cancel prescription' });
  }
};

// Get pharmacy stats
const getPharmacyStats = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [
      pendingCount,
      dispensedToday,
      stockoutCount,
      totalToday
    ] = await Promise.all([
      prisma.prescription.count({ where: { status: 'Pending' } }),
      prisma.prescription.count({
        where: {
          status: 'Dispensed',
          updated_at: { gte: today }
        }
      }),
      prisma.prescription.count({ where: { status: 'Stockout' } }),
      prisma.prescription.count({
        where: { created_at: { gte: today } }
      })
    ]);

    res.json({
      pendingCount,
      dispensedToday,
      stockoutCount,
      totalToday
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch pharmacy stats' });
  }
};

// Get prescriptions by patient
const getPatientPrescriptions = async (req, res) => {
  const { patientId } = req.params;

  try {
    const prescriptions = await prisma.prescription.findMany({
      where: { patient_id: parseInt(patientId) },
      include: {
        visit: {
          select: {
            visit_date: true,
            diagnosis: true
          }
        }
      },
      orderBy: { created_at: 'desc' }
    });
    res.json(prescriptions);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch patient prescriptions' });
  }
};

module.exports = {
  getPendingPrescriptions,
  getAllPrescriptions,
  dispensePrescription,
  markStockout,
  cancelPrescription,
  getPharmacyStats,
  getPatientPrescriptions
};
