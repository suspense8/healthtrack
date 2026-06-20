const prisma = require('../../config/database');
const { logAction } = require('../shared/auditLogger');
const vectorSearchService = require('../../services/vectorSearch.service');
const notificationService = require('../../services/notification.service');

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

const getQueue = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const { type } = req.query; // 'regular' or 'emergency_obstetric'

    let whereClause = {
      visit_date: { gte: today },
      queue_status: 'Ready for Doctor'
    };

    // Filter by type
    if (type === 'emergency_obstetric') {
      whereClause.is_emergency = true;
    } else if (type === 'regular') {
      whereClause.is_emergency = false;
    }

    const queue = await prisma.attendanceLog.findMany({
      where: whereClause,
      include: {
        patient: {
          select: {
            first_name: true,
            last_name: true,
            patient_id: true,
            gender: true,
            date_of_birth: true,
            existing_conditions: true,
            allergies: true
          }
        },
        obstetric_visit: true  // Include obstetric data for pregnancy cases
      },
      orderBy: [
        { is_emergency: 'desc' },
        { queue_number: 'asc' }
      ]
    });
    res.json(queue);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch doctor queue' });
  }
};

const submitConsultation = async (req, res) => {
  const {
    visit_id,
    symptoms,
    physical_exam,
    diagnosis,
    doctor_notes,
    prescriptions, // Array of { medication_name, dosage, frequency, duration }
    lab_orders,    // Array of { test_type, urgency }
    disposition,   // 'Admitted', 'Referred', 'Discharged'
    referral_dest,
    admission_notes,
    follow_up_date
  } = req.body;

  try {
    // 1. Update AttendanceLog with consultation details
    const visit = await prisma.attendanceLog.update({
      where: { visit_id: parseInt(visit_id) },
      data: {
        queue_status: disposition === 'Admitted' ? 'Admitted' : 'Pharmacy', // Move to Pharmacy by default, or Admitted
        symptoms,
        physical_exam,
        diagnosis,
        doctor_notes,
        disposition,
        referral_dest,
        admission_notes,
        // If discharged with no meds, maybe 'Completed'? For now 'Pharmacy' is safe if meds exist.
        // If no meds and discharged, we might want 'Completed'.
        // Let's refine:
        queue_status: (disposition === 'Admitted') ? 'Admitted' :
          (prescriptions && prescriptions.length > 0) ? 'Pharmacy' : 'Completed'
      }
    });

    const patient_id = visit.patient_id;

    // 2. Create Prescriptions
    if (prescriptions && prescriptions.length > 0) {
      await prisma.prescription.createMany({
        data: prescriptions.map(p => ({
          visit_id: parseInt(visit_id),
          patient_id: patient_id,
          medication_name: p.medication_name,
          medicine_id: p.medicine_id ? parseInt(p.medicine_id) : null,
          dosage: p.dosage,
          frequency: p.frequency,
          duration: p.duration,
          prescribed_by: req.user.userId,
          status: 'Pending'
        }))
      });
    }

    // 3. Create Lab Orders
    if (lab_orders && lab_orders.length > 0) {
      await prisma.labOrder.createMany({
        data: lab_orders.map(l => ({
          visit_id: parseInt(visit_id),
          patient_id: patient_id,
          test_type: l.test_type,
          urgency: l.urgency || 'Routine',
          ordered_by: req.user.userId,
          status: 'Pending'
        }))
      });
      // If labs are ordered, maybe status should reflect that? 
      // For now, we keep flow linear: Doctor -> Pharmacy -> Lab (or parallel).
    }

    // 4. Create Follow-up Appointment
    if (follow_up_date) {
      await prisma.appointment.create({
        data: {
          patient_id: patient_id,
          scheduled_date: new Date(follow_up_date),
          reason: 'Follow-up Consultation',
          created_by: req.user.userId
        }
      });
    }

    // Log the consultation
    await logAction({
      userId: req.user.userId,
      action: 'SUBMIT_CONSULTATION',
      entity: 'Visit',
      entityId: visit.visit_id,
      afterSnapshot: {
        diagnosis,
        disposition,
        prescriptions_count: prescriptions?.length || 0,
        lab_orders_count: lab_orders?.length || 0
      }
    });

    // Get patient info for notifications
    const patient = await prisma.patient.findUnique({
      where: { patient_id: patient_id },
      select: { first_name: true, last_name: true, patient_id: true }
    });

    // Notify pharmacy if prescriptions were created
    if (patient && prescriptions && prescriptions.length > 0) {
      notificationService.notifyPrescriptionCreated(patient, prescriptions.length);
    }

    // Notify lab for each lab order
    if (patient && lab_orders && lab_orders.length > 0) {
      for (const labOrder of lab_orders) {
        notificationService.notifyLabOrderCreated(patient, labOrder.test_type, labOrder.urgency || 'Routine');
      }
    }

    // Notify nurse if admission was requested
    if (patient && disposition === 'Admitted') {
      notificationService.notifyAdmissionRequested(patient, 'Ward');
    }

    res.json({ message: 'Consultation submitted successfully', visit_id });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to submit consultation' });
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

const getAppointments = async (req, res) => {
  try {
    const appointments = await prisma.appointment.findMany({
      where: {
        status: {
          in: ['Scheduled', 'Checked In', 'Vitals Complete', 'Rescheduled']
        }
      },
      include: {
        patient: {
          select: {
            first_name: true,
            last_name: true,
            phone_number: true,
            patient_id: true
          }
        }
      },
      orderBy: { scheduled_date: 'asc' }
    });
    res.json(appointments);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch appointments' });
  }
};

const createAppointment = async (req, res) => {
  const { patient_id, scheduled_date, reason } = req.body;
  try {
    const appointment = await prisma.appointment.create({
      data: {
        patient_id: parseInt(patient_id),
        scheduled_date: new Date(scheduled_date),
        reason,
        created_by: req.user.userId
      }
    });
    res.status(201).json(appointment);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create appointment' });
  }
};

const getDoctorStats = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // 1. Patients Waiting for Consultation
    const waitingCount = await prisma.attendanceLog.count({
      where: {
        visit_date: { gte: today },
        queue_status: 'Ready for Doctor'
      }
    });

    // 2. Appointments Due Today
    const appointmentsTodayCount = await prisma.appointment.count({
      where: {
        scheduled_date: {
          gte: today,
          lt: tomorrow
        }
      }
    });

    // 3. Closest Upcoming Appointment
    const nextAppointment = await prisma.appointment.findFirst({
      where: {
        scheduled_date: { gte: new Date() }
      },
      include: {
        patient: {
          select: {
            first_name: true,
            last_name: true
          }
        }
      },
      orderBy: { scheduled_date: 'asc' }
    });

    res.json({
      waitingCount,
      appointmentsTodayCount,
      nextAppointment
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch doctor stats' });
  }
};

const getLastVisit = async (req, res) => {
  const { patientId } = req.params;
  try {
    const lastVisit = await prisma.attendanceLog.findFirst({
      where: {
        patient_id: parseInt(patientId),
        queue_status: { in: ['Completed', 'Pharmacy', 'Admitted'] }
      },
      include: {
        prescriptions: true
      },
      orderBy: { visit_date: 'desc' },
      take: 1
    });
    res.json(lastVisit);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch last visit' });
  }
};

const completeAppointment = async (req, res) => {
  const { appointment_id, notes, is_final, prescriptions } = req.body;
  try {
    // Update appointment status
    const appointment = await prisma.appointment.update({
      where: { appointment_id: parseInt(appointment_id) },
      data: { status: 'Completed' }
    });

    // If the patient was checked in, there should be an AttendanceLog.
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const visit = await prisma.attendanceLog.findFirst({
      where: {
        appointment_id: parseInt(appointment_id),
        visit_date: { gte: today }
      }
    });

    if (visit) {
      await prisma.attendanceLog.update({
        where: { visit_id: visit.visit_id },
        data: {
          queue_status: (prescriptions && prescriptions.length > 0) ? 'Pharmacy' : 'Completed',
          doctor_notes: notes,
          disposition: is_final ? 'Discharged' : 'Follow-up'
        }
      });

      // Create Prescriptions if any
      if (prescriptions && prescriptions.length > 0) {
        await prisma.prescription.createMany({
          data: prescriptions.map(p => ({
            visit_id: visit.visit_id,
            patient_id: visit.patient_id,
            medication_name: p.medication_name,
            medicine_id: p.medicine_id ? parseInt(p.medicine_id) : null,
            dosage: p.dosage,
            frequency: p.frequency,
            duration: p.duration,
            prescribed_by: req.user.userId,
            status: 'Pending'
          }))
        });
      }
    }

    res.json({ message: 'Appointment completed' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to complete appointment' });
  }
};

const getPrescriptions = async (req, res) => {
  try {
    const prescriptions = await prisma.prescription.findMany({
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

/**
 * Search diseases by symptoms using vector similarity
 * POST /api/doctor/search-diseases
 */
const searchDiseases = async (req, res) => {
  const { symptoms, limit = 10 } = req.body;

  if (!symptoms || !symptoms.trim()) {
    return res.status(400).json({ error: 'Symptoms description is required' });
  }

  try {
    const results = await vectorSearchService.searchDiseases(symptoms, { limit });
    res.json(results);
  } catch (error) {
    console.error('Disease search error:', error);
    res.status(500).json({ error: 'Failed to search diseases' });
  }
};

/**
 * Get disease details by ID
 * GET /api/doctor/diseases/:id
 */
const getDiseaseById = async (req, res) => {
  const { id } = req.params;

  try {
    const disease = await vectorSearchService.getDiseaseById(id);
    if (!disease) {
      return res.status(404).json({ error: 'Disease not found' });
    }
    res.json(disease);
  } catch (error) {
    console.error('Get disease error:', error);
    res.status(500).json({ error: 'Failed to fetch disease' });
  }
};

/**
 * Autocomplete diseases by name (fast, no vector search)
 * GET /api/doctor/diseases/autocomplete?query=mal
 */
const autocompleteDiseases = async (req, res) => {
  const { query } = req.query;

  if (!query || query.trim().length < 2) {
    return res.json([]);
  }

  const searchQuery = query.trim();

  try {
    // Fast name-based search with fuzzy matching
    const results = await prisma.$queryRaw`
      SELECT 
        id,
        name,
        description,
        CASE 
          WHEN LOWER(name) = LOWER(${searchQuery}) THEN 1.0
          WHEN LOWER(name) LIKE LOWER(${searchQuery + '%'}) THEN 0.95
          WHEN LOWER(name) LIKE LOWER(${'%' + searchQuery + '%'}) THEN 0.85
          ELSE similarity(LOWER(name), LOWER(${searchQuery}))
        END as match_score
      FROM diseases
      WHERE 
        LOWER(name) LIKE LOWER(${'%' + searchQuery + '%'})
        OR similarity(LOWER(name), LOWER(${searchQuery})) > 0.25
      ORDER BY 
        CASE 
          WHEN LOWER(name) = LOWER(${searchQuery}) THEN 1
          WHEN LOWER(name) LIKE LOWER(${searchQuery + '%'}) THEN 2
          WHEN LOWER(name) LIKE LOWER(${'%' + searchQuery + '%'}) THEN 3
          ELSE 4
        END,
        similarity(LOWER(name), LOWER(${searchQuery})) DESC
      LIMIT 8
    `;

    res.json(results.map(r => ({
      id: r.id,
      name: r.name,
      description: r.description?.substring(0, 100) + (r.description?.length > 100 ? '...' : ''),
      matchScore: Math.round(Number(r.match_score) * 100)
    })));
  } catch (error) {
    console.error('Autocomplete error:', error);
    res.status(500).json({ error: 'Autocomplete failed' });
  }
};

/**
 * Search medicines by name, generic name, or description using vector similarity
 * POST /api/doctor/search-medicines
 */
const searchMedicines = async (req, res) => {
  const { query, limit = 10 } = req.body;

  try {
    const results = await vectorSearchService.searchMedicines(query, { limit });
    res.json(results);
  } catch (error) {
    console.error('Medicine search error:', error);
    res.status(500).json({ error: 'Failed to search medicines' });
  }
};

/**
 * Get medicine details by ID
 * GET /api/doctor/medicines/:id
 */
const getMedicineById = async (req, res) => {
  const { id } = req.params;

  try {
    const medicine = await vectorSearchService.getMedicineById(id);
    if (!medicine) {
      return res.status(404).json({ error: 'Medicine not found' });
    }
    res.json(medicine);
  } catch (error) {
    console.error('Get medicine error:', error);
    res.status(500).json({ error: 'Failed to fetch medicine' });
  }
};

/**
 * Autocomplete medicines by name (fast, no vector search)
 * GET /api/doctor/medicines/autocomplete?query=par
 */
const autocompleteMedicines = async (req, res) => {
  const { query } = req.query;

  if (!query || query.trim().length < 2) {
    return res.json([]);
  }

  const searchQuery = query.trim();

  try {
    // Fast name-based search with fuzzy matching - includes inventory fields
    const results = await prisma.$queryRaw`
      SELECT 
        id,
        name,
        generic_name,
        ndc_code,
        manufacturer,
        quantity,
        reorder_level,
        unit,
        CASE 
          WHEN LOWER(name) = LOWER(${searchQuery}) THEN 1.0
          WHEN LOWER(name) LIKE LOWER(${searchQuery + '%'}) THEN 0.95
          WHEN LOWER(name) LIKE LOWER(${'%' + searchQuery + '%'}) THEN 0.85
          WHEN LOWER(generic_name) LIKE LOWER(${'%' + searchQuery + '%'}) THEN 0.80
          ELSE similarity(LOWER(name), LOWER(${searchQuery}))
        END as match_score
      FROM medicines
      WHERE 
        LOWER(name) LIKE LOWER(${'%' + searchQuery + '%'})
        OR LOWER(generic_name) LIKE LOWER(${'%' + searchQuery + '%'})
        OR LOWER(ndc_code) LIKE LOWER(${'%' + searchQuery + '%'})
        OR similarity(LOWER(name), LOWER(${searchQuery})) > 0.25
      ORDER BY 
        CASE 
          WHEN LOWER(name) = LOWER(${searchQuery}) THEN 1
          WHEN LOWER(name) LIKE LOWER(${searchQuery + '%'}) THEN 2
          WHEN LOWER(name) LIKE LOWER(${'%' + searchQuery + '%'}) THEN 3
          WHEN LOWER(generic_name) LIKE LOWER(${'%' + searchQuery + '%'}) THEN 4
          ELSE 5
        END,
        match_score DESC,
        name ASC
      LIMIT 50
    `;

    // Deduplicate medicines by name, keeping only clinically different ones
    const medicineMap = new Map();
    const normalizedResults = results.map(r => ({
      id: r.id,
      name: r.name?.trim() || '',
      genericName: r.generic_name?.trim() || null,
      ndcCode: r.ndc_code?.trim() || null,
      manufacturer: r.manufacturer?.trim() || null,
      matchScore: Number(r.match_score),
      quantity: r.quantity ?? 0,
      reorderLevel: r.reorder_level ?? 10,
      unit: r.unit || 'units',
      isLowStock: (r.quantity ?? 0) <= (r.reorder_level ?? 10),
      isOutOfStock: (r.quantity ?? 0) === 0
    }));

    // Helper function to check if generic name is meaningfully different
    const isGenericNameDifferent = (name1, name2) => {
      if (!name1 || !name2) return false;
      const n1 = name1.toLowerCase().trim();
      const n2 = name2.toLowerCase().trim();
      // If generic name is same as brand name, it's not meaningfully different
      return n1 !== n2 && n1.length > 0 && n2.length > 0;
    };

    // Helper function to extract strength/form from name
    const extractStrengthForm = (name) => {
      const match = name.match(/(\d+\s*(mg|g|ml|mcg|%|units?))|(tablet|capsule|syrup|injection|cream|ointment|drops?|inhaler|spray)/i);
      return match ? match[0].toLowerCase() : null;
    };

    for (const medicine of normalizedResults) {
      const nameKey = medicine.name.toLowerCase();
      const medicineStrengthForm = extractStrengthForm(medicine.name);

      // Check if we already have this exact name
      if (!medicineMap.has(nameKey)) {
        // First occurrence of this name
        medicineMap.set(nameKey, medicine);
      } else {
        const existing = medicineMap.get(nameKey);
        const existingStrengthForm = extractStrengthForm(existing.name);

        // Check if this medicine is clinically different (not just different manufacturer)
        const isClinicallyDifferent =
          // Different generic names (and generic name is different from brand name)
          isGenericNameDifferent(medicine.genericName, existing.genericName) ||
          // Different strength/form in the name itself
          (medicineStrengthForm && existingStrengthForm &&
            medicineStrengthForm !== existingStrengthForm) ||
          // One has generic name that's different from brand, other doesn't
          (medicine.genericName && medicine.genericName.toLowerCase() !== nameKey &&
            (!existing.genericName || existing.genericName.toLowerCase() === nameKey)) ||
          (existing.genericName && existing.genericName.toLowerCase() !== nameKey &&
            (!medicine.genericName || medicine.genericName.toLowerCase() === nameKey));

        if (isClinicallyDifferent) {
          // Keep both if clinically different
          if (Array.isArray(existing)) {
            existing.push(medicine);
          } else {
            medicineMap.set(nameKey, [existing, medicine]);
          }
        } else {
          // Same medicine, different manufacturer/NDC - keep only the best one
          // Prefer higher match score
          if (medicine.matchScore > existing.matchScore) {
            medicineMap.set(nameKey, medicine);
          } else if (medicine.matchScore === existing.matchScore) {
            // If match scores equal, prefer the one with more complete information
            const existingInfo = [existing.genericName, existing.manufacturer, existing.ndcCode].filter(Boolean).length;
            const medicineInfo = [medicine.genericName, medicine.manufacturer, medicine.ndcCode].filter(Boolean).length;
            if (medicineInfo > existingInfo) {
              medicineMap.set(nameKey, medicine);
            } else if (medicineInfo === existingInfo) {
              // If still equal, prefer the one with generic name (if it's different from brand)
              if (medicine.genericName && medicine.genericName.toLowerCase() !== nameKey &&
                (!existing.genericName || existing.genericName.toLowerCase() === nameKey)) {
                medicineMap.set(nameKey, medicine);
              }
            }
          }
        }
      }
    }

    // Flatten the results (handle arrays of clinically different medicines)
    const deduplicatedResults = [];
    for (const value of medicineMap.values()) {
      if (Array.isArray(value)) {
        // Sort by match score and add all clinically different versions
        value.sort((a, b) => b.matchScore - a.matchScore);
        deduplicatedResults.push(...value);
      } else {
        deduplicatedResults.push(value);
      }
    }

    // Sort final results by match score and limit to 20
    deduplicatedResults.sort((a, b) => b.matchScore - a.matchScore);

    res.json(deduplicatedResults.slice(0, 20));
  } catch (error) {
    console.error('Medicine autocomplete error:', error);
    res.status(500).json({ error: 'Failed to autocomplete medicines' });
  }
};

module.exports = {
  getQueue,
  getVisit,
  submitConsultation,
  getPatient,
  getPatientHistory,
  getAppointments,
  createAppointment,
  getDoctorStats,
  getLastVisit,
  completeAppointment,
  getPrescriptions,
  searchPatients,
  searchDiseases,
  getDiseaseById,
  autocompleteDiseases,
  searchMedicines,
  getMedicineById,
  autocompleteMedicines
};

