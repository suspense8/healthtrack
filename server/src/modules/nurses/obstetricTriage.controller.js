const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const TaskManager = require('../../services/taskManager');

/**
 * Record Obstetric Triage
 * POST /api/nurses/obstetric-triage/:visitId
 */
const recordObstetricTriage = async (req, res) => {
  const { visitId } = req.params;
  const { vitals, obstetric_assessment, nurse_notes, task_id } = req.body;

  try {
    // Update visit with vitals
    const visit = await prisma.attendanceLog.update({
      where: { visit_id: parseInt(visitId) },
      data: {
        systolic_bp: vitals.systolic_bp,
        diastolic_bp: vitals.diastolic_bp,
        heart_rate: vitals.heart_rate,
        temperature: vitals.temperature,
        oxygen_saturation: vitals.oxygen_saturation,
        weight: vitals.weight,
        nurse_notes,
        triage_level: determineMaternalTriageLevel(vitals, obstetric_assessment),
        queue_status: 'Ready for Doctor',
        needs_vitals: false
      }
    });

    // Update obstetric visit
    const obstetricVisit = await prisma.obstetricVisit.update({
      where: { visit_id: parseInt(visitId) },
      data: {
        contraction_frequency: obstetric_assessment.contraction_frequency,
        membranes_ruptured: obstetric_assessment.membranes_ruptured,
        rupture_time: obstetric_assessment.rupture_time ? new Date(obstetric_assessment.rupture_time) : null,
        bleeding_severity: obstetric_assessment.bleeding_severity,
        cervical_dilation_cm: obstetric_assessment.cervical_dilation_cm,
        fetal_heart_rate: obstetric_assessment.fetal_heart_rate,
        fetal_presentation: obstetric_assessment.fetal_presentation,
        maternal_distress: obstetric_assessment.maternal_distress || false,
        fetal_distress: obstetric_assessment.fetal_distress || false
      }
    });

    // Complete triage task if provided
    if (task_id) {
      await TaskManager.completeTask(parseInt(task_id), req.user.userId, 'Triage completed');
    }

    // Determine risk level and create doctor review task
    const riskLevel = assessMaternalRisk(vitals, obstetric_assessment);
    const priority = riskLevel === 'high' ? 'critical' : riskLevel === 'medium' ? 'urgent' : 'normal';

    const triageSummary = `G${obstetricVisit.gravida || '?'}P${obstetricVisit.para || '?'}, ${obstetricVisit.gestational_age_weeks || '?'}w, ${obstetric_assessment.cervical_dilation_cm || '?'}cm dilated, FHR ${obstetric_assessment.fetal_heart_rate || '?'}`;

    const doctorTask = await TaskManager.createDoctorReviewTask(
      visit.visit_id,
      priority,
      triageSummary
    );

    // Check for critical alerts
    const alerts = checkCriticalAlerts(vitals, obstetric_assessment);

    // Emit notifications
    const io = req.app.get('io');
    if (io) {
      io.to('doctor').emit('emergency:obstetric:review_needed', {
        visitId: visit.visit_id,
        patientId: visit.patient_id,
        triageSummary,
        riskLevel,
        alerts,
        taskId: doctorTask.task_id
      });

      // If critical alerts, send to all medical staff
      if (alerts.length > 0 && riskLevel === 'high') {
        io.emit('emergency:critical_alert', {
          visitId: visit.visit_id,
          alerts,
          message: `CRITICAL: ${triageSummary}`
        });
      }
    }

    // Log action (audit logging can be added later)

    res.json({
      message: 'Obstetric triage recorded',
      visit_id: visit.visit_id,
      risk_level: riskLevel,
      alerts,
      doctor_task_id: doctorTask.task_id
    });

  } catch (error) {
    console.error('Obstetric triage error:', error);
    res.status(500).json({ error: 'Failed to record obstetric triage' });
  }
};

/**
 * Determine maternal triage level
 */
function determineMaternalTriageLevel(vitals, assessment) {
  // Red (Critical) criteria
  if (
    vitals.systolic_bp > 160 ||
    vitals.diastolic_bp > 110 ||
    assessment.bleeding_severity === 'Heavy' ||
    assessment.fetal_distress ||
    assessment.fetal_heart_rate < 110 ||
    assessment.fetal_heart_rate > 160
  ) {
    return 'Red';
  }

  // Yellow (Urgent) criteria
  if (
    vitals.systolic_bp > 140 ||
    vitals.diastolic_bp > 90 ||
    assessment.bleeding_severity === 'Moderate' ||
    assessment.cervical_dilation_cm >= 8 ||
    assessment.maternal_distress
  ) {
    return 'Yellow';
  }

  // Green (Routine)
  return 'Green';
}

/**
 * Assess maternal risk level
 */
function assessMaternalRisk(vitals, assessment) {
  const criticalFactors = [];

  if (vitals.systolic_bp > 160 || vitals.diastolic_bp > 110) criticalFactors.push('severe_hypertension');
  if (assessment.bleeding_severity === 'Heavy') criticalFactors.push('heavy_bleeding');
  if (assessment.fetal_distress || assessment.fetal_heart_rate < 110 || assessment.fetal_heart_rate > 160) criticalFactors.push('fetal_distress');

  if (criticalFactors.length > 0) return 'high';

  const moderateFactors = [];
  if (vitals.systolic_bp > 140 || vitals.diastolic_bp > 90) moderateFactors.push('hypertension');
  if (assessment.bleeding_severity === 'Moderate') moderateFactors.push('moderate_bleeding');
  if (assessment.maternal_distress) moderateFactors.push('maternal_distress');

  if (moderateFactors.length > 0) return 'medium';

  return 'low';
}

/**
 * Check for critical alerts
 */
function checkCriticalAlerts(vitals, assessment) {
  const alerts = [];

  if (vitals.systolic_bp > 160 || vitals.diastolic_bp > 110) {
    alerts.push({ type: 'severe_hypertension', message: `BP: ${vitals.systolic_bp}/${vitals.diastolic_bp} - Severe hypertension/preeclampsia risk` });
  }

  if (assessment.fetal_heart_rate < 110) {
    alerts.push({ type: 'fetal_bradycardia', message: `FHR: ${assessment.fetal_heart_rate} - Fetal bradycardia` });
  }

  if (assessment.fetal_heart_rate > 160) {
    alerts.push({ type: 'fetal_tachycardia', message: `FHR: ${assessment.fetal_heart_rate} - Fetal tachycardia` });
  }

  if (assessment.bleeding_severity === 'Heavy') {
    alerts.push({ type: 'heavy_bleeding', message: 'Heavy vaginal bleeding - possible placental abruption/previa' });
  }

  return alerts;
}

/**
 * Get obstetric patients pending doctor review
 * GET /api/nurses/obstetric-pending-review
 */
const getObstetricPendingReview = async (req, res) => {
  try {
    const visits = await prisma.attendanceLog.findMany({
      where: {
        is_emergency: true,
        queue_status: 'Ready for Doctor'
      },
      include: {
        patient: true,
        obstetric_visit: true
      },
      orderBy: { visit_date: 'desc' }
    });

    res.json(visits);
  } catch (error) {
    console.error('Error fetching pending reviews:', error);
    res.status(500).json({ error: 'Failed to fetch pending reviews' });
  }
};

module.exports = {
  recordObstetricTriage,
  getObstetricPendingReview
};
