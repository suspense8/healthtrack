const prisma = require('../../config/database');
const { logAction } = require('../shared/auditLogger');
const notificationService = require('../../services/notification.service');

// --- Patient Management ---

const extractPatientData = (data) => {
  const {
    first_name, last_name, middle_name,
    date_of_birth, estimated_age, age,
    gender, national_id, patient_type,
    phone_number, email, address,
    emergency_contact_name, emergency_contact_phone,
    allergies, existing_conditions,
    first_visit, partial_profile, is_temp_record,
    id_verification_status
  } = data;

  let finalDob = date_of_birth;
  if (finalDob === "") finalDob = null;

  if (!finalDob && estimated_age) {
    const ageNum = parseInt(estimated_age);
    if (!isNaN(ageNum)) {
      const today = new Date();
      finalDob = new Date(today.getFullYear() - ageNum, 0, 1);
    }
  }

  // Calculate age from DOB if not provided
  let calculatedAge = age;
  if (!calculatedAge && finalDob) {
    const birthDate = new Date(finalDob);
    const today = new Date();
    calculatedAge = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      calculatedAge--;
    }
    if (calculatedAge < 0 || calculatedAge > 120) calculatedAge = null;
  }

  return {
    // Store all names in lowercase
    first_name: first_name ? first_name.toLowerCase().trim() : first_name,
    last_name: last_name ? last_name.toLowerCase().trim() : last_name,
    middle_name: middle_name ? middle_name.toLowerCase().trim() : middle_name,
    date_of_birth: finalDob,
    age: calculatedAge,
    gender, national_id, patient_type,
    // Store phone numbers as digits only (remove formatting)
    phone_number: phone_number ? phone_number.replace(/\D/g, '') : phone_number,
    // Store email in lowercase
    email: email ? email.toLowerCase().trim() : email,
    // Store address in lowercase
    address: address ? address.toLowerCase().trim() : address,
    // Store emergency contact name in lowercase
    emergency_contact_name: emergency_contact_name ? emergency_contact_name.toLowerCase().trim() : emergency_contact_name,
    emergency_contact_phone: emergency_contact_phone ? emergency_contact_phone.replace(/\D/g, '') : emergency_contact_phone,
    // Store medical context in lowercase
    allergies: allergies ? allergies.toLowerCase().trim() : allergies,
    existing_conditions: existing_conditions ? existing_conditions.toLowerCase().trim() : existing_conditions,
    first_visit, partial_profile, is_temp_record,
    id_verification_status
  };
};

const createPatient = async (req, res) => {
  try {
    const patientData = extractPatientData(req.body);
    const patient = await prisma.patient.create({
      data: {
        ...patientData,
        created_by: req.user.userId,
      },
    });

    // Log the action
    await logAction({
      userId: req.user.userId,
      action: 'CREATE_PATIENT',
      entity: 'Patient',
      entityId: patient.patient_id,
      afterSnapshot: {
        name: `${patient.first_name} ${patient.last_name}`,
        national_id: patient.national_id,
        patient_type: patient.patient_type,
        is_temp: patient.is_temp_record
      }
    });

    res.status(201).json(patient);
  } catch (error) {
    console.error(error);
    if (error.code === 'P2002') {
      return res.status(409).json({ error: 'Patient with this National ID or Phone already exists' });
    }
    res.status(500).json({ error: 'Failed to create patient' });
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

const getPatient = async (req, res) => {
  const { id } = req.params;
  try {
    const patient = await prisma.patient.findUnique({
      where: { patient_id: parseInt(id) },
      include: {
        visits: {
          take: 5,
          orderBy: { visit_date: 'desc' }
        }
      },
    });
    if (!patient) return res.status(404).json({ error: 'Patient not found' });
    res.json(patient);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch patient' });
  }
};

const updatePatient = async (req, res) => {
  const { id } = req.params;
  try {
    // Get before snapshot
    const beforePatient = await prisma.patient.findUnique({
      where: { patient_id: parseInt(id) }
    });

    // Transform data to lowercase for names, email, address, etc.
    const updateData = { ...req.body };
    if (updateData.first_name) updateData.first_name = updateData.first_name.toLowerCase().trim();
    if (updateData.last_name) updateData.last_name = updateData.last_name.toLowerCase().trim();
    if (updateData.middle_name) updateData.middle_name = updateData.middle_name.toLowerCase().trim();
    if (updateData.email) updateData.email = updateData.email.toLowerCase().trim();
    if (updateData.address) updateData.address = updateData.address.toLowerCase().trim();
    if (updateData.allergies) updateData.allergies = updateData.allergies.toLowerCase().trim();
    if (updateData.existing_conditions) updateData.existing_conditions = updateData.existing_conditions.toLowerCase().trim();
    if (updateData.emergency_contact_name) updateData.emergency_contact_name = updateData.emergency_contact_name.toLowerCase().trim();
    if (updateData.phone_number) updateData.phone_number = updateData.phone_number.replace(/\D/g, '');
    if (updateData.emergency_contact_phone) updateData.emergency_contact_phone = updateData.emergency_contact_phone.replace(/\D/g, '');

    // Calculate age from DOB if DOB is being updated
    if (updateData.date_of_birth && !updateData.age) {
      const birthDate = new Date(updateData.date_of_birth);
      const today = new Date();
      let calculatedAge = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        calculatedAge--;
      }
      if (calculatedAge >= 0 && calculatedAge <= 120) {
        updateData.age = calculatedAge;
      }
    }

    const patient = await prisma.patient.update({
      where: { patient_id: parseInt(id) },
      data: updateData,
    });

    // Log the action
    await logAction({
      userId: req.user.userId,
      action: 'UPDATE_PATIENT',
      entity: 'Patient',
      entityId: patient.patient_id,
      beforeSnapshot: beforePatient ? {
        name: `${beforePatient.first_name} ${beforePatient.last_name}`,
        phone: beforePatient.phone_number,
        email: beforePatient.email
      } : null,
      afterSnapshot: {
        name: `${patient.first_name} ${patient.last_name}`,
        phone: patient.phone_number,
        email: patient.email
      }
    });

    res.json(patient);
  } catch (error) {
    console.error(error);
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Patient not found' });
    }
    res.status(500).json({ error: 'Failed to update patient' });
  }
};

const verifyPatient = async (req, res) => {
  const { id } = req.params;
  const { phone_number, address, emergency_contact_name, emergency_contact_phone } = req.body;

  try {
    const patient = await prisma.patient.update({
      where: { patient_id: parseInt(id) },
      data: {
        phone_number,
        address,
        emergency_contact_name,
        emergency_contact_phone,
        id_verification_status: 'verified',
        first_visit: false,
      },
    });

    // Log the action
    await logAction({
      userId: req.user.userId,
      action: 'VERIFY_PATIENT',
      entity: 'Patient',
      entityId: patient.patient_id,
      afterSnapshot: {
        name: `${patient.first_name} ${patient.last_name}`,
        verification_status: 'verified'
      }
    });

    res.json(patient);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Verification failed' });
  }
};

const visitStateMachine = require('../../services/visitStateMachine');

// --- Check-in & Queue ---

const getAppointmentsForToday = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const appointments = await prisma.appointment.findMany({
      where: {
        scheduled_date: {
          gte: today,
          lt: tomorrow
        },
        status: 'Scheduled' // Only show scheduled ones, not yet checked in
      },
      include: {
        patient: {
          select: {
            first_name: true,
            last_name: true,
            patient_id: true,
            phone_number: true,
            national_id: true
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

const checkIn = async (req, res) => {
  const { patient_id, visit_reason, is_emergency, visit_type, referred_by, appointment_id } = req.body;

  if (!patient_id) {
    return res.status(400).json({ error: 'patient_id is required' });
  }

  try {
    // Use transaction to ensure atomic queue number assignment
    const visit = await prisma.$transaction(async (tx) => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Get today's max queue number with exclusive lock
      const lastVisit = await tx.attendanceLog.findFirst({
        where: {
          visit_date: { gte: today },
        },
        orderBy: { queue_number: 'desc' },
      });

      const queue_number = (lastVisit?.queue_number || 0) + 1;

      // Determine initial state via state machine
      const queue_status = await visitStateMachine.getInitialState(
        { isEmergency: !!is_emergency, appointmentId: appointment_id },
        tx
      );

      const now = new Date();

      const newVisit = await tx.attendanceLog.create({
        data: {
          patient_id: parseInt(patient_id),
          visit_reason,
          is_emergency: !!is_emergency,
          visit_type: visit_type || (appointment_id ? 'Appointment' : 'Walk-in'),
          referred_by,
          appointment_id: appointment_id ? parseInt(appointment_id) : null,
          queue_number,
          queue_status,
          visit_date: today,
          visit_time: now,
          created_by: req.user.userId,
        },
      });

      // Update patient first_visit flag within same transaction
      await tx.patient.update({
        where: { patient_id: parseInt(patient_id) },
        data: { first_visit: false },
      });

      return newVisit;
    });

    // Log the check-in action
    await logAction({
      userId: req.user.userId,
      action: 'CHECK_IN_PATIENT',
      entity: 'Visit',
      entityId: visit.visit_id,
      afterSnapshot: {
        queue_number: visit.queue_number,
        visit_type: visit.visit_type,
        is_emergency: visit.is_emergency,
        queue_status: visit.queue_status
      }
    });

    // Notify nurses about new patient in queue
    const patient = await prisma.patient.findUnique({
      where: { patient_id: parseInt(patient_id) },
      select: { first_name: true, last_name: true, patient_id: true }
    });

    if (patient) {
      notificationService.notifyPatientQueued(patient, visit.queue_number, visit.is_emergency);
    }

    res.status(201).json(visit);
  } catch (error) {
    console.error('Check-in error:', error);
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Patient not found' });
    }
    res.status(500).json({ error: 'Check-in failed', details: error.message });
  }
};

const getQueue = async (req, res) => {
  const { status } = req.query;
  const where = {};

  if (status) {
    // If a specific status is requested, use it
    where.queue_status = status;
  } else {
    // Default: Show only reception-relevant statuses
    // These are patients still in the reception/triage workflow
    // Excludes patients who have moved to doctor, pharmacy, admission, etc.
    where.queue_status = {
      in: ['Waiting', 'Emergency', 'In Vitals', 'Vitals Complete']
    };
  }

  // Filter by today
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  where.visit_date = { gte: today };

  try {
    const queue = await prisma.attendanceLog.findMany({
      where,
      include: {
        patient: {
          select: {
            first_name: true,
            last_name: true,
            patient_id: true,
            is_temp_record: true,
            allergies: true
          }
        }
      },
      orderBy: [
        { is_emergency: 'desc' }, // Emergencies first
        { queue_number: 'asc' }
      ]
    });
    // Attach a computed position (1-indexed rank in the current active queue).
    // queue_number reflects arrival order for the day (fixed at check-in);
    // position reflects where the patient actually stands among those still waiting.
    const queueWithPosition = queue.map((visit, index) => ({
      ...visit,
      position: index + 1,
    }));
    res.json(queueWithPosition);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch queue' });
  }
};

const updateVisitStatus = async (req, res) => {
  const { id } = req.params;
  const { queue_status } = req.body;

  try {
    // Get before snapshot
    const beforeVisit = await prisma.attendanceLog.findUnique({
      where: { visit_id: parseInt(id) }
    });

    const visit = await prisma.attendanceLog.update({
      where: { visit_id: parseInt(id) },
      data: { queue_status },
    });

    // Log the action
    await logAction({
      userId: req.user.userId,
      action: 'UPDATE_VISIT_STATUS',
      entity: 'Visit',
      entityId: visit.visit_id,
      beforeSnapshot: beforeVisit ? { queue_status: beforeVisit.queue_status } : null,
      afterSnapshot: { queue_status: visit.queue_status }
    });

    res.json(visit);
  } catch (error) {
    console.error(error);
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Visit not found' });
    }
    res.status(500).json({ error: 'Failed to update visit status' });
  }
};

// --- Attendance Records ---

const getAttendanceRecords = async (req, res) => {
  const { startDate, endDate, patientName, visitType, isEmergency, queueStatus } = req.query;

  try {
    const where = {};

    // Date range filter
    if (startDate || endDate) {
      where.visit_date = {};
      if (startDate) {
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        where.visit_date.gte = start;
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        where.visit_date.lte = end;
      }
    }

    // Visit type filter
    if (visitType && visitType !== 'All') {
      where.visit_type = visitType;
    }

    // Emergency filter
    if (isEmergency !== undefined && isEmergency !== 'All') {
      where.is_emergency = isEmergency === 'true';
    }

    // Queue status filter
    if (queueStatus && queueStatus !== 'All') {
      where.queue_status = queueStatus;
    }

    // Patient name filter (applied after fetch due to relation)
    const records = await prisma.attendanceLog.findMany({
      where,
      include: {
        patient: {
          select: {
            patient_id: true,
            first_name: true,
            last_name: true,
            phone_number: true,
            national_id: true,
          }
        }
      },
      orderBy: [
        { visit_date: 'desc' },
        { visit_time: 'desc' }
      ]
    });

    // Filter by patient name if provided
    let filteredRecords = records;
    if (patientName) {
      const searchTerm = patientName.toLowerCase();
      filteredRecords = records.filter(record => {
        const fullName = `${record.patient.first_name} ${record.patient.last_name}`.toLowerCase();
        return fullName.includes(searchTerm);
      });
    }

    res.json(filteredRecords);
  } catch (error) {
    console.error('Error fetching attendance records:', error);
    res.status(500).json({ error: 'Failed to fetch attendance records' });
  }
};

// --- Offline Sync ---

const syncOfflineActions = async (req, res) => {
  const { actions } = req.body;
  const results = [];

  for (const action of actions) {
    try {
      if (action.type === 'CREATE_PATIENT') {
        let patient = null;
        if (action.payload.national_id) {
          patient = await prisma.patient.findUnique({
            where: { national_id: action.payload.national_id }
          });
        }

        if (!patient) {
          const patientData = extractPatientData(action.payload);
          patient = await prisma.patient.create({
            data: { ...patientData, created_by: req.user.userId }
          });
        }

        results.push({ tempId: action.tempId, status: 'SUCCESS', realId: patient.patient_id });

      } else if (action.type === 'CHECK_IN') {
        const { patient_id, ...rest } = action.payload;

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const lastVisit = await prisma.attendanceLog.findFirst({
          where: { visit_date: { gte: today } },
          orderBy: { queue_number: 'desc' },
        });
        const queue_number = (lastVisit?.queue_number || 0) + 1;

        const now = new Date();
        const visit = await prisma.attendanceLog.create({
          data: {
            patient_id: parseInt(patient_id),
            ...rest,
            queue_number,
            visit_date: today,
            visit_time: now,
            created_by: req.user.userId
          }
        });
        results.push({ tempId: action.tempId, status: 'SUCCESS', realId: visit.visit_id, queue_number });
      }
    } catch (error) {
      console.error(`Sync error for action ${action.type}:`, error);
      results.push({ tempId: action.tempId, status: 'ERROR', error: error.message });
    }
  }

  res.json({ results });
};

module.exports = {
  createPatient,
  searchPatients,
  getPatient,
  updatePatient,
  verifyPatient,
  checkIn,
  getQueue,
  updateVisitStatus,
  getAttendanceRecords,
  syncOfflineActions,
  getAppointmentsForToday
};
