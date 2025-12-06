const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// ============== WARD & BED MANAGEMENT ==============

const getWards = async (req, res) => {
  try {
    const wards = await prisma.ward.findMany({
      where: { is_active: true },
      include: {
        beds: true,
        _count: {
          select: {
            admissions: { where: { admission_status: 'Admitted' } }
          }
        }
      }
    });

    // Calculate availability for each ward
    const wardsWithAvailability = wards.map(ward => {
      const availableBeds = ward.beds.filter(b => b.status === 'Available').length;
      const occupiedBeds = ward.beds.filter(b => b.status === 'Occupied').length;
      return {
        ...ward,
        available_beds: availableBeds,
        occupied_beds: occupiedBeds,
        occupancy_rate: ward.beds.length > 0 
          ? Math.round((occupiedBeds / ward.beds.length) * 100) 
          : 0
      };
    });

    res.json(wardsWithAvailability);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch wards' });
  }
};

const getWardBeds = async (req, res) => {
  const { wardId } = req.params;
  try {
    const beds = await prisma.bed.findMany({
      where: { ward_id: parseInt(wardId) },
      include: {
        admissions: {
          where: { admission_status: 'Admitted' },
          take: 1,
          orderBy: { admitted_at: 'desc' }
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

// ============== ADMISSION REQUESTS ==============

const createAdmissionRequest = async (req, res) => {
  const { 
    patient_id, 
    visit_id, 
    ward_id, 
    priority, 
    admission_reason, 
    initial_orders 
  } = req.body;

  try {
    const admission = await prisma.admission.create({
      data: {
        patient_id,
        visit_id,
        ward_id,
        priority: priority || 'Normal',
        admission_reason,
        initial_orders,
        doctor_id: req.user.userId,
        admission_status: 'Pending'
      }
    });

    // Update the visit/attendance log
    await prisma.attendanceLog.update({
      where: { visit_id },
      data: { 
        queue_status: 'Pending Admission',
        disposition: 'Admitted'
      }
    });

    res.status(201).json({ message: 'Admission request created', admission });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create admission request' });
  }
};

const getPendingAdmissions = async (req, res) => {
  const { wardId } = req.query;
  const where = { admission_status: 'Pending' };
  
  if (wardId) {
    where.ward_id = parseInt(wardId);
  }

  try {
    const admissions = await prisma.admission.findMany({
      where,
      include: {
        ward: true
      },
      orderBy: [
        { priority: 'desc' }, // Critical first
        { requested_at: 'asc' }
      ]
    });

    // Fetch patient and visit data separately since we don't have FK relations
    const enrichedAdmissions = await Promise.all(
      admissions.map(async (admission) => {
        const [patient, visit] = await Promise.all([
          prisma.patient.findUnique({
            where: { patient_id: admission.patient_id },
            select: {
              patient_id: true,
              first_name: true,
              last_name: true,
              date_of_birth: true,
              gender: true,
              phone_number: true,
              allergies: true,
              existing_conditions: true
            }
          }),
          prisma.attendanceLog.findUnique({
            where: { visit_id: admission.visit_id },
            select: {
              visit_id: true,
              systolic_bp: true,
              diastolic_bp: true,
              heart_rate: true,
              temperature: true,
              oxygen_saturation: true,
              diagnosis: true,
              triage_level: true
            }
          })
        ]);
        return { ...admission, patient, visit };
      })
    );

    res.json(enrichedAdmissions);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch pending admissions' });
  }
};

const acceptAdmission = async (req, res) => {
  const { id } = req.params;
  const { bed_id, nurse_notes } = req.body;

  try {
    // Start transaction
    const [admission, bed] = await prisma.$transaction(async (tx) => {
      // Update admission
      const adm = await tx.admission.update({
        where: { admission_id: parseInt(id) },
        data: {
          admission_status: 'Admitted',
          bed_id,
          nurse_id: req.user.userId,
          admitted_at: new Date()
        }
      });

      // Mark bed as occupied
      const b = await tx.bed.update({
        where: { bed_id },
        data: { status: 'Occupied' }
      });

      // Update attendance log
      await tx.attendanceLog.update({
        where: { visit_id: adm.visit_id },
        data: { queue_status: 'Admitted' }
      });

      // Create initial nurse note if provided
      if (nurse_notes) {
        await tx.admissionNote.create({
          data: {
            admission_id: adm.admission_id,
            user_id: req.user.userId,
            note_type: 'Observation',
            content: nurse_notes
          }
        });
      }

      return [adm, b];
    });

    res.json({ message: 'Patient admitted', admission, bed });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to accept admission' });
  }
};

const rejectAdmission = async (req, res) => {
  const { id } = req.params;
  const { reason } = req.body;

  try {
    const admission = await prisma.admission.update({
      where: { admission_id: parseInt(id) },
      data: {
        admission_status: 'Rejected',
        rejection_reason: reason || 'No bed available',
        nurse_id: req.user.userId
      }
    });

    // Update attendance log
    await prisma.attendanceLog.update({
      where: { visit_id: admission.visit_id },
      data: { queue_status: 'Admission Rejected' }
    });

    res.json({ message: 'Admission rejected', admission });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to reject admission' });
  }
};

// ============== ADMITTED PATIENTS MANAGEMENT ==============

const getAdmittedPatients = async (req, res) => {
  const { wardId, status, includeAll } = req.query;
  
  // Build where clause based on status parameter
  let where = {};
  
  if (status) {
    where.admission_status = status;
  } else if (includeAll === 'true') {
    // Include all statuses including Discharged (for reports/history)
    where.admission_status = { 
      in: ['Admitted', 'Pending Discharge', 'Discharged'] 
    };
  } else {
    // Default: only active patients (Admitted and Pending Discharge)
    where.admission_status = { 
      in: ['Admitted', 'Pending Discharge'] 
    };
  }
  
  if (wardId) {
    where.ward_id = parseInt(wardId);
  }

  try {
    const admissions = await prisma.admission.findMany({
      where,
      include: {
        ward: true,
        bed: true,
        notes: {
          orderBy: { created_at: 'desc' },
          take: 5
        }
      },
      orderBy: { admitted_at: 'desc' }
    });

    // Enrich with patient data
    const enriched = await Promise.all(
      admissions.map(async (adm) => {
        const patient = await prisma.patient.findUnique({
          where: { patient_id: adm.patient_id }
        });
        return { ...adm, patient };
      })
    );

    res.json(enriched);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch admitted patients' });
  }
};

const getAdmissionDetails = async (req, res) => {
  const { id } = req.params;

  try {
    const admission = await prisma.admission.findUnique({
      where: { admission_id: parseInt(id) },
      include: {
        ward: true,
        bed: true,
        notes: {
          orderBy: { created_at: 'desc' }
        }
      }
    });

    if (!admission) {
      return res.status(404).json({ error: 'Admission not found' });
    }

    const [patient, visit] = await Promise.all([
      prisma.patient.findUnique({ where: { patient_id: admission.patient_id } }),
      prisma.attendanceLog.findUnique({ where: { visit_id: admission.visit_id } })
    ]);

    res.json({ ...admission, patient, visit });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch admission details' });
  }
};

const addAdmissionNote = async (req, res) => {
  const { id } = req.params;
  const { note_type, content, vitals } = req.body;

  try {
    const noteData = {
      admission_id: parseInt(id),
      user_id: req.user.userId,
      note_type,
      content
    };

    // Add vitals if provided
    if (vitals) {
      noteData.systolic_bp = vitals.systolic_bp;
      noteData.diastolic_bp = vitals.diastolic_bp;
      noteData.heart_rate = vitals.heart_rate;
      noteData.temperature = vitals.temperature;
      noteData.oxygen_saturation = vitals.oxygen_saturation;
    }

    const note = await prisma.admissionNote.create({ data: noteData });

    res.status(201).json(note);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to add note' });
  }
};

// ============== DISCHARGE ==============

const initiateDischarge = async (req, res) => {
  const { id } = req.params;
  const { discharge_summary, discharge_meds, follow_up_date } = req.body;

  try {
    const admission = await prisma.admission.update({
      where: { admission_id: parseInt(id) },
      data: {
        admission_status: 'Pending Discharge',
        discharge_summary,
        discharge_meds,
        follow_up_date: follow_up_date ? new Date(follow_up_date) : null
      }
    });

    res.json({ message: 'Discharge initiated', admission });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to initiate discharge' });
  }
};

const confirmDischarge = async (req, res) => {
  const { id } = req.params;

  try {
    const [admission] = await prisma.$transaction(async (tx) => {
      // Update admission
      const adm = await tx.admission.update({
        where: { admission_id: parseInt(id) },
        data: {
          admission_status: 'Discharged',
          discharged_at: new Date()
        }
      });

      // Free up the bed
      if (adm.bed_id) {
        await tx.bed.update({
          where: { bed_id: adm.bed_id },
          data: { status: 'Available' }
        });
      }

      // Update attendance log
      await tx.attendanceLog.update({
        where: { visit_id: adm.visit_id },
        data: { queue_status: 'Discharged' }
      });

      // Create follow-up appointment if specified
      if (adm.follow_up_date) {
        await tx.appointment.create({
          data: {
            patient_id: adm.patient_id,
            scheduled_date: adm.follow_up_date,
            status: 'Scheduled',
            reason: 'Post-discharge follow-up'
          }
        });
      }

      return [adm];
    });

    res.json({ message: 'Patient discharged', admission });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to confirm discharge' });
  }
};

// ============== STATS ==============

const getAdmissionStats = async (req, res) => {
  try {
    const [
      pendingCount,
      admittedCount,
      dischargedToday,
      criticalCount
    ] = await Promise.all([
      prisma.admission.count({ where: { admission_status: 'Pending' } }),
      prisma.admission.count({ where: { admission_status: 'Admitted' } }),
      prisma.admission.count({
        where: {
          admission_status: 'Discharged',
          discharged_at: { gte: new Date(new Date().setHours(0, 0, 0, 0)) }
        }
      }),
      prisma.admission.count({
        where: { admission_status: 'Admitted', priority: 'Critical' }
      })
    ]);

    res.json({ pendingCount, admittedCount, dischargedToday, criticalCount });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
};

module.exports = {
  getWards,
  getWardBeds,
  createAdmissionRequest,
  getPendingAdmissions,
  acceptAdmission,
  rejectAdmission,
  getAdmittedPatients,
  getAdmissionDetails,
  addAdmissionNote,
  initiateDischarge,
  confirmDischarge,
  getAdmissionStats
};
