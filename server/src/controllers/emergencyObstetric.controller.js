const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const TaskManager = require('../services/taskManager');

/**
 * Register Emergency Patient (any type)
 * POST /api/reception/register-emergency-obstetric
 */
const registerEmergencyObstetric = async (req, res) => {
  const { patient_id, patient_data, obstetric_data, complaint, emergency_type } = req.body;

  // Default to 'Labor' for backwards compatibility
  const subtype = emergency_type || 'Labor';
  const isLabor = subtype === 'Labor';

  try {
    let patientId = patient_id;

    // Create new patient if needed
    if (!patientId && patient_data) {
      const newPatient = await prisma.patient.create({
        data: {
          first_name: patient_data.first_name,
          last_name: patient_data.last_name || '',
          age: patient_data.age,
          gender: 'Female',
          phone_number: patient_data.phone_number,
          emergency_contact_name: patient_data.emergency_contact_name,
          emergency_contact_phone: patient_data.emergency_contact_phone,
          patient_type: 'Walk-in',
          partial_profile: true,
          created_by: req.user.userId
        }
      });
      patientId = newPatient.patient_id;
    }

    if (!patientId) {
      return res.status(400).json({ error: 'Patient ID or patient data required' });
    }

    // Get next queue number
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const queueCount = await prisma.attendanceLog.count({
      where: {
        visit_date: { gte: today }
      }
    });

    // Create visit with emergency classification
    const visit = await prisma.attendanceLog.create({
      data: {
        patient_id: patientId,
        visit_reason: complaint || `Emergency ${subtype}`,
        is_emergency: true,
        emergency_subtype: subtype,
        visit_type: 'Walk-in',
        queue_number: queueCount + 1,
        queue_status: 'Waiting',
        needs_vitals: true,
        created_by: req.user.userId
      }
    });

    // Create obstetric visit record only for Labor
    let obstetricVisit = null;
    if (isLabor && obstetric_data) {
      obstetricVisit = await prisma.obstetricVisit.create({
        data: {
          visit_id: visit.visit_id,
          gravida: obstetric_data?.gravida,
          para: obstetric_data?.para,
          gestational_age_weeks: obstetric_data?.gestational_age_weeks,
          previous_csection: obstetric_data?.previous_csection || false,
          edd: obstetric_data?.edd ? new Date(obstetric_data.edd) : null
        }
      });
    }

    // Auto-create triage task for nurse
    const task = await TaskManager.createTriageTask(visit.visit_id, 'critical');

    // Emit socket notification to nurses
    const io = req.app.get('io');
    if (io) {
      if (isLabor) {
        io.to('nurse').emit('emergency:obstetric:triage_needed', {
          visitId: visit.visit_id,
          patientId,
          queueNumber: visit.queue_number,
          complaint,
          gestationalAge: obstetric_data?.gestational_age_weeks,
          taskId: task.task_id
        });
      } else {
        io.to('nurse').emit('emergency:triage_needed', {
          visitId: visit.visit_id,
          patientId,
          queueNumber: visit.queue_number,
          emergencyType: subtype,
          complaint,
          taskId: task.task_id
        });
      }
    }

    res.status(201).json({
      message: `Emergency patient registered (${subtype})`,
      visit_id: visit.visit_id,
      obstetric_visit_id: obstetricVisit?.obstetric_visit_id || null,
      queue_number: visit.queue_number,
      task_id: task.task_id,
      emergency_type: subtype
    });

  } catch (error) {
    console.error('Emergency registration error:', error);
    res.status(500).json({ error: 'Failed to register emergency patient' });
  }
};

/**
 * Get all emergency visits pending triage
 * GET /api/reception/emergency-obstetric-queue?type=Labor
 */
const getEmergencyObstetricQueue = async (req, res) => {
  try {
    const { type } = req.query;

    const whereClause = {
      is_emergency: true,
      queue_status: { in: ['Waiting', 'In Progress'] }
    };

    // Optionally filter by a specific emergency subtype
    if (type) {
      whereClause.emergency_subtype = type;
    }

    const visits = await prisma.attendanceLog.findMany({
      where: whereClause,
      include: {
        patient: {
          select: {
            patient_id: true,
            first_name: true,
            last_name: true,
            age: true
          }
        },
        obstetric_visit: true
      },
      orderBy: { visit_date: 'desc' }
    });

    res.json(visits);
  } catch (error) {
    console.error('Error fetching emergency queue:', error);
    res.status(500).json({ error: 'Failed to fetch queue' });
  }
};

module.exports = {
  registerEmergencyObstetric,
  getEmergencyObstetricQueue
};
