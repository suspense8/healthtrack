const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const TaskManager = require('../../services/taskManager');

/**
 * Doctor Obstetric Review
 * POST /api/doctor/obstetric-review/:visitId
 */
const obstetricReview = async (req, res) => {
  const { visitId } = req.params;
  const { examination, risk_assessment, management_decision, orders, notes, task_id } = req.body;

  try {
    // Update obstetric visit with doctor's findings
    const obstetricVisit = await prisma.obstetricVisit.update({
      where: { visit_id: parseInt(visitId) },
      data: {
        cervical_dilation_cm: examination.cervical_dilation_cm || undefined,
        fetal_presentation: examination.fetal_presentation || undefined,
        fetal_station: examination.station || undefined,
        labor_stage: examination.labor_stage || undefined,
        management_plan: notes,
        preeclampsia_risk: risk_assessment.preeclampsia_risk || false,
        hypertension: risk_assessment.hypertension || false
      }
    });

    // Update visit status
    await prisma.attendanceLog.update({
      where: { visit_id: parseInt(visitId) },
      data: {
        symptoms: examination.presenting_complaint || undefined,
        doctor_notes: notes,
        queue_status: 'With Doctor'
      }
    });

    // Complete doctor review task
    if (task_id) {
      await TaskManager.completeTask(parseInt(task_id), req.user.userId, 'Review completed');
    }

    // Handle management decision
    let nextTask = null;
    let response = { message: 'Obstetric review completed' };

    if (management_decision === 'IMMEDIATE_DELIVERY') {
      // Create delivery task for nurse
      nextTask = await TaskManager.createDeliveryTask(parseInt(visitId));
      
      // Update visit status
      await prisma.attendanceLog.update({
        where: { visit_id: parseInt(visitId) },
        data: { queue_status: 'Delivery in Progress' }
      });

      // Emit notification to nurse
      const io = req.app.get('io');
      if (io) {
        io.to('nurse').emit('delivery:preparation_needed', {
          visitId: parseInt(visitId),
          taskId: nextTask.task_id,
          message: 'Prepare for delivery'
        });
      }

      response.nextStep = 'delivery_preparation';
      response.task_id = nextTask.task_id;

    } else if (management_decision === 'MONITOR_LABOR') {
      // Create first partograph entry
      await prisma.partographEntry.create({
        data: {
          obstetric_visit_id: obstetricVisit.obstetric_visit_id,
          recorded_by_user_id: req.user.userId,
          cervical_dilation_cm: examination.cervical_dilation_cm,
          fetal_heart_rate: obstetricVisit.fetal_heart_rate,
          blood_pressure_systolic: examination.bp_systolic,
          blood_pressure_diastolic: examination.bp_diastolic,
          hours_in_labor: 0
        }
      });

      response.nextStep = 'partograph_monitoring';
      response.message = 'Labor monitoring initiated - Partograph started';

    } else if (management_decision === 'REFERRAL') {
      // Update status
      await prisma.attendanceLog.update({
        where: { visit_id: parseInt(visitId) },
        data: {
          disposition: 'Referred',
          referral_dest: orders.referral_destination
        }
      });

      response.nextStep = 'referral_process';
      response.message = 'Patient marked for referral';
    }

    // Log action (audit logging can be added later)

    res.json(response);

  } catch (error) {
    console.error('Obstetric review error:', error);
    res.status(500).json({ error: 'Failed to record obstetric review' });
  }
};

/**
 * Add Partograph Entry
 * POST /api/doctor/partograph/:visitId
 */
const addPartographEntry = async (req, res) => {
  const { visitId } = req.params;
  const { vitals, labor_progress, interventions, notes } = req.body;

  try {
    const obstetricVisit = await prisma.obstetricVisit.findUnique({
      where: { visit_id: parseInt(visitId) },
      include: { partograph_entries: { orderBy: { recorded_at: 'desc' }, take: 1 } }
    });

    if (!obstetricVisit) {
      return res.status(404).json({ error: 'Obstetric visit not found' });
    }

    // Calculate hours in labor
    const firstEntry = await prisma.partographEntry.findFirst({
      where: { obstetric_visit_id: obstetricVisit.obstetric_visit_id },
      orderBy: { recorded_at: 'asc' }
    });

    const hoursInLabor = firstEntry
      ? (new Date() - new Date(firstEntry.recorded_at)) / (1000 * 60 * 60)
      : 0;

    // Check for prolonged labor (no progress in dilation for > 2 hours)
    let prolongedLaborAlert = false;
    let fetalDistressAlert = false;
    
    if (obstetricVisit.partograph_entries.length > 0) {
      const lastEntry = obstetricVisit.partograph_entries[0];
      const hoursSinceLastEntry = (new Date() - new Date(lastEntry.recorded_at)) / (1000 * 60 * 60);
      
      if (
        hoursSinceLastEntry >= 2 &&
        lastEntry.cervical_dilation_cm === labor_progress.cervical_dilation_cm
      ) {
        prolongedLaborAlert = true;
      }
    }

    // Check fetal heart rate
    if (vitals.fetal_heart_rate < 110 || vitals.fetal_heart_rate > 160) {
      fetalDistressAlert = true;
    }

    // Create partograph entry
    const entry = await prisma.partographEntry.create({
      data: {
        obstetric_visit_id: obstetricVisit.obstetric_visit_id,
        recorded_by_user_id: req.user.userId,
        hours_in_labor: hoursInLabor,
        cervical_dilation_cm: labor_progress.cervical_dilation_cm,
        contractions_per_10min: labor_progress.contractions_per_10min,
        contraction_duration_sec: labor_progress.contraction_duration_sec,
        fetal_heart_rate: vitals.fetal_heart_rate,
        blood_pressure_systolic: vitals.blood_pressure_systolic,
        blood_pressure_diastolic: vitals.blood_pressure_diastolic,
        pulse: vitals.pulse,
        temperature: vitals.temperature,
        fluids_given: interventions?.fluids_given,
        medications_given: interventions?.medications_given,
        prolonged_labor_alert: prolongedLaborAlert,
        fetal_distress_alert: fetalDistressAlert,
        notes
      }
    });

    // Send alerts if needed
    const io = req.app.get('io');
    if (io && (prolongedLaborAlert || fetalDistressAlert)) {
      io.to('doctor').emit('partograph:alert', {
        visitId: parseInt(visitId),
        prolongedLabor: prolongedLaborAlert,
        fetalDistress: fetalDistressAlert,
        entryId: entry.entry_id
      });
    }

    res.json({
      message: 'Partograph entry added',
      entry_id: entry.entry_id,
      alerts: {
        prolonged_labor: prolongedLaborAlert,
        fetal_distress: fetalDistressAlert
      }
    });

  } catch (error) {
    console.error('Partograph entry error:', error);
    res.status(500).json({ error: 'Failed to add partograph entry' });
  }
};

/**
 * Get Partograph Data
 * GET /api/doctor/partograph/:visitId
 */
const getPartographData = async (req, res) => {
  const { visitId } = req.params;

  try {
    const obstetricVisit = await prisma.obstetricVisit.findUnique({
      where: { visit_id: parseInt(visitId) },
      include: {
        partograph_entries: {
          orderBy: { recorded_at: 'asc' }
        },
        visit: {
          include: {
            patient: {
              select: {
                first_name: true,
                last_name: true,
                age: true
              }
            }
          }
        }
      }
    });

    if (!obstetricVisit) {
      return res.status(404).json({ error: 'Obstetric visit not found' });
    }

    res.json(obstetricVisit);

  } catch (error) {
    console.error('Get partograph error:', error);
    res.status(500).json({ error: 'Failed to fetch partograph data' });
  }
};

module.exports = {
  obstetricReview,
  addPartographEntry,
  getPartographData
};
