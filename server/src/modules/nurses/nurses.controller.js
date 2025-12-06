const prisma = require('../../config/database');

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
      }
    });
    res.json(visit);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update vitals' });
  }
};

module.exports = {
  getQueue,
  updateVitals
};
