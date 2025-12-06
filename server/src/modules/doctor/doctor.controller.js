const prisma = require('../../config/database');
const { logAction } = require('../shared/auditLogger');
const vectorSearchService = require('../../services/vectorSearch.service');
const notificationService = require('../../services/notification.service');

const getQueue = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const queue = await prisma.attendanceLog.findMany({
      where: {
        visit_date: { gte: today },
        queue_status: 'Ready for Doctor' // Doctors only see patients ready for them
      },
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
        patient_id: parseInt(patientId),
        queue_status: 'Completed' // Only show completed visits
      },
      orderBy: { visit_date: 'desc' },
      select: {
        visit_id: true,
        visit_date: true,
        visit_reason: true,
        diagnosis: true,
        treatment_plan: true,
        doctor_notes: true,
        prescriptions: true,
        lab_orders: true
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
          in: ['Scheduled', 'Checked In', 'Rescheduled']
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
    today.setHours(0,0,0,0);
    
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
      // Exact match on phone_number
      patients = await prisma.patient.findMany({
        where: { phone_number: query },
        take: 20,
      });
    } else if (query) {
      // Fuzzy search on name, id, phone
      patients = await prisma.patient.findMany({
        where: {
          OR: [
            { first_name: { contains: query } },
            { last_name: { contains: query } },
            { national_id: { contains: query } },
            { phone_number: { contains: query } },
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

module.exports = {
  getQueue,
  submitConsultation,
  getPatientHistory,
  getAppointments,
  createAppointment,
  getDoctorStats,
  getLastVisit,
  completeAppointment,
  getPrescriptions,
  searchPatients,
  searchDiseases,
  getDiseaseById
};

