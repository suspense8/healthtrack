const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Obstetric Admission
 * Simplified admission for labor emergencies
 * POST /api/doctor/obstetric-admit/:visitId
 */
const obstetricAdmit = async (req, res) => {
  const { visitId } = req.params;
  const { management_decision, admission_details } = req.body;

  try {
    // Update obstetric visit with doctor's decision
    const obstetricVisit = await prisma.obstetricVisit.update({
      where: { visit_id: parseInt(visitId) },
      data: {
        doctor_assessment: admission_details.admission_notes,
        management_decision,
        reviewed_at: new Date(),
        reviewed_by_user_id: req.user.userId
      }
    });

    // Create admission request
    const admission = await prisma.admission.create({
      data: {
        visit_id: parseInt(visitId),
        patient_id: obstetricVisit.patient_id,
        admitted_by_user_id: req.user.userId,
        ward_type: admission_details.ward_type,
        admission_reason: `Emergency Labor - ${management_decision}`,
        clinical_notes: `${admission_details.admission_notes}\n\nDelivery Plan: ${admission_details.delivery_plan}`,
        admission_status:'Pending',
        admission_date: new Date()
      }
    });

    // Update visit status
    await prisma.attendanceLog.update({
      where: { visit_id: parseInt(visitId) },
      data: {
        queue_status: 'Admitted',
        notes: `Admitted to ${admission_details.ward_type} for delivery`
      }
    });

    // Emit notification to nurses
    const io = req.app.get('io');
    if (io) {
      io.to('nurse').emit('admission:new_request', {
        admissionId: admission.admission_id,
        visitId: parseInt(visitId),
        wardType: admission_details.ward_type,
        isObstetric: true
      });
    }

    res.status(201).json({
      message: 'Obstetric admission created',
      admission_id: admission.admission_id,
      visit_id: parseInt(visitId)
    });

  } catch (error) {
    console.error('Obstetric admission error:', error);
    res.status(500).json({ error: 'Failed to create admission' });
  }
};

module.exports = {
  obstetricAdmit
};
