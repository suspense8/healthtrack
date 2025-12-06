const prisma = require('../../config/database');
const notificationService = require('../../services/notification.service');

const getQueue = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const { status } = req.query;
    
    let statusFilter = {};
    if (status === 'active') {
      statusFilter = { in: ['Waiting', 'waiting_for_vitals', 'Emergency'] };
    } else if (status === 'process') {
      statusFilter = { in: ['Ready for Doctor', 'In Progress', 'Completed'] };
    }

    const queue = await prisma.attendanceLog.findMany({
      where: {
        visit_date: { gte: today },
        queue_status: statusFilter
      },
      include: {
        patient: {
          select: {
            first_name: true,
            last_name: true,
            patient_id: true,
            gender: true,
            date_of_birth: true,
          }
        }
      },
      orderBy: [
        { is_emergency: 'desc' },
        { queue_number: 'asc' }
      ]
    });
    res.json(queue);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch nurse queue' });
  }
};

const updateVitals = async (req, res) => {
  const { 
    visit_id, 
    systolic_bp, diastolic_bp, heart_rate, respiratory_rate, 
    temperature, oxygen_saturation, weight, height,
    triage_level, nurse_notes, next_step
  } = req.body;

  try {
    let newStatus = 'Ready for Doctor'; // Default

    // Determine status based on next_step or triage
    if (next_step === 'discharge') {
      newStatus = 'Completed';
    } else if (next_step === 'treat_by_nurse') {
      newStatus = 'In Progress';
    } else if (triage_level === 'Red') {
      newStatus = 'Emergency';
    }

    const visit = await prisma.attendanceLog.update({
      where: { visit_id: parseInt(visit_id) },
      data: { 
        systolic_bp: parseInt(systolic_bp) || null,
        diastolic_bp: parseInt(diastolic_bp) || null,
        heart_rate: parseInt(heart_rate) || null,
        respiratory_rate: parseInt(respiratory_rate) || null,
        temperature: parseFloat(temperature) || null,
        oxygen_saturation: parseInt(oxygen_saturation) || null,
        weight: parseFloat(weight) || null,
        height: parseFloat(height) || null,
        triage_level,
        nurse_notes,
        queue_status: newStatus,
        needs_vitals: false
      },
      include: {
        patient: {
          select: { first_name: true, last_name: true, patient_id: true }
        }
      }
    });

    // Notify doctor if patient is ready for consultation
    if (newStatus === 'Ready for Doctor' || newStatus === 'Emergency') {
      notificationService.notifyReadyForDoctor(visit.patient, visit.visit_id);
    }

    res.json(visit);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update vitals' });
  }
};

// ============== WARD MANAGEMENT ==============

/**
 * Get all wards with bed counts
 */
const getWards = async (req, res) => {
  try {
    const wards = await prisma.ward.findMany({
      where: { is_active: true },
      include: {
        beds: true,
        _count: {
          select: { admissions: { where: { admission_status: 'Admitted' } } }
        }
      },
      orderBy: { ward_name: 'asc' }
    });

    // Calculate available beds for each ward
    const wardsWithAvailability = wards.map(ward => ({
      ...ward,
      available_beds: ward.beds.filter(b => b.status === 'Available').length,
      occupied_beds: ward.beds.filter(b => b.status === 'Occupied').length,
      total_beds: ward.beds.length
    }));

    res.json(wardsWithAvailability);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch wards' });
  }
};

/**
 * Create a new ward
 */
const createWard = async (req, res) => {
  const { ward_name, ward_type, total_beds, description } = req.body;

  try {
    const ward = await prisma.ward.create({
      data: {
        ward_name,
        ward_type,
        total_beds: parseInt(total_beds) || 10,
        description
      }
    });
    res.status(201).json(ward);
  } catch (error) {
    console.error(error);
    if (error.code === 'P2002') {
      res.status(400).json({ error: 'Ward name already exists' });
    } else {
      res.status(500).json({ error: 'Failed to create ward' });
    }
  }
};

/**
 * Update a ward
 */
const updateWard = async (req, res) => {
  const { ward_id } = req.params;
  const { ward_name, ward_type, description, is_active } = req.body;

  try {
    const ward = await prisma.ward.update({
      where: { ward_id: parseInt(ward_id) },
      data: {
        ward_name,
        ward_type,
        description,
        is_active
      }
    });
    res.json(ward);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update ward' });
  }
};

/**
 * Get beds in a ward
 */
const getBeds = async (req, res) => {
  const { ward_id } = req.params;

  try {
    const beds = await prisma.bed.findMany({
      where: { ward_id: parseInt(ward_id) },
      include: {
        admissions: {
          where: { admission_status: 'Admitted' },
          take: 1
        }
      },
      orderBy: { bed_number: 'asc' }
    });
    res.json(beds);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch beds' });
  }
};

/**
 * Add a bed to a ward
 */
const addBed = async (req, res) => {
  const { ward_id } = req.params;
  const { bed_number, notes } = req.body;

  try {
    const bed = await prisma.bed.create({
      data: {
        ward_id: parseInt(ward_id),
        bed_number,
        notes,
        status: 'Available'
      }
    });

    // Update ward total_beds count
    await prisma.ward.update({
      where: { ward_id: parseInt(ward_id) },
      data: { total_beds: { increment: 1 } }
    });

    res.status(201).json(bed);
  } catch (error) {
    console.error(error);
    if (error.code === 'P2002') {
      res.status(400).json({ error: 'Bed number already exists in this ward' });
    } else {
      res.status(500).json({ error: 'Failed to add bed' });
    }
  }
};

/**
 * Update bed status
 */
const updateBed = async (req, res) => {
  const { bed_id } = req.params;
  const { status, notes } = req.body;

  try {
    const bed = await prisma.bed.update({
      where: { bed_id: parseInt(bed_id) },
      data: { status, notes }
    });
    res.json(bed);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update bed' });
  }
};

/**
 * Delete a bed
 */
const deleteBed = async (req, res) => {
  const { bed_id } = req.params;

  try {
    const bed = await prisma.bed.findUnique({
      where: { bed_id: parseInt(bed_id) }
    });

    if (!bed) {
      return res.status(404).json({ error: 'Bed not found' });
    }

    await prisma.bed.delete({
      where: { bed_id: parseInt(bed_id) }
    });

    // Decrement ward total_beds count
    await prisma.ward.update({
      where: { ward_id: bed.ward_id },
      data: { total_beds: { decrement: 1 } }
    });

    res.json({ message: 'Bed deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to delete bed' });
  }
};

module.exports = {
  getQueue,
  updateVitals,
  // Ward management
  getWards,
  createWard,
  updateWard,
  getBeds,
  addBed,
  updateBed,
  deleteBed
};
