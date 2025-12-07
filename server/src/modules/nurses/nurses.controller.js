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

const getVisit = async (req, res) => {
  const { visitId } = req.params;
  try {
    const visit = await prisma.attendanceLog.findUnique({
      where: { visit_id: parseInt(visitId) },
      include: {
        patient: {
          select: {
            patient_id: true,
            first_name: true,
            last_name: true,
            date_of_birth: true,
            gender: true,
            national_id: true,
            allergies: true,
            existing_conditions: true
          }
        }
      }
    });
    if (!visit) {
      return res.status(404).json({ error: 'Visit not found' });
    }
    res.json(visit);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch visit' });
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

const getPatient = async (req, res) => {
  const { patientId } = req.params;
  try {
    const patient = await prisma.patient.findUnique({
      where: { patient_id: parseInt(patientId) },
      select: {
        patient_id: true,
        first_name: true,
        last_name: true,
        date_of_birth: true,
        gender: true,
        national_id: true,
        phone_number: true,
        address: true,
        allergies: true,
        existing_conditions: true,
        date_registered: true
      }
    });
    if (!patient) {
      return res.status(404).json({ error: 'Patient not found' });
    }
    res.json(patient);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch patient' });
  }
};

const searchPatients = async (req, res) => {
  const { query, searchType } = req.query;
  
  try {
    let patients = [];

    if (searchType === 'id' && query) {
      // Exact match on national_id
      patients = await prisma.patient.findMany({
        where: { national_id: query },
        take: 20,
      });
    } else if (searchType === 'phone' && query) {
      // Strip non-digits from phone query to match stored format
      const normalizedPhone = query.replace(/\D/g, '');
      patients = await prisma.patient.findMany({
        where: { phone_number: normalizedPhone },
        take: 20,
      });
    } else if (query) {
      // Normalize query to lowercase to match database storage
      const normalizedQuery = query.toLowerCase().trim();
      
      // Fuzzy search on name, id, phone
      patients = await prisma.patient.findMany({
        where: {
          OR: [
            { first_name: { contains: normalizedQuery } },
            { last_name: { contains: normalizedQuery } },
            { national_id: { contains: query } }, // Keep original case for ID
            { phone_number: { contains: query.replace(/\D/g, '') } }, // Strip formatting
          ],
        },
        take: 20,
      });
    }

    res.json(patients);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Search failed' });
  }
};

const getPatientHistory = async (req, res) => {
  const { patientId } = req.params;
  try {
    const history = await prisma.attendanceLog.findMany({
      where: { 
        patient_id: parseInt(patientId)
        // Show all visits, not just completed ones
      },
      orderBy: { visit_date: 'desc' },
      select: {
        visit_id: true,
        visit_date: true,
        visit_reason: true,
        queue_status: true,
        is_emergency: true,
        diagnosis: true,
        treatment_plan: true,
        doctor_notes: true,
        symptoms: true,
        // Vitals
        systolic_bp: true,
        diastolic_bp: true,
        heart_rate: true,
        temperature: true,
        oxygen_saturation: true,
        weight: true,
        height: true,
        triage_level: true,
        nurse_notes: true,
        // Related records
        prescriptions: {
          select: {
            medication_name: true,
            dosage: true,
            frequency: true,
            duration: true,
            status: true
          }
        },
        lab_orders: {
          select: {
            test_type: true,
            urgency: true,
            status: true,
            results: true
          }
        }
      }
    });
    res.json(history);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch patient history' });
  }
};

module.exports = {
  getQueue,
  getVisit,
  updateVitals,
  // Ward management
  getWards,
  createWard,
  updateWard,
  getBeds,
  addBed,
  updateBed,
  deleteBed,
  // Patient management
  getPatient,
  searchPatients,
  getPatientHistory
};
