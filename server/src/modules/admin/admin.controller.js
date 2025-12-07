const prisma = require('../../config/database');
const { logAction } = require('../shared/auditLogger');

// ============== SYSTEM STATS ==============

const getSystemStats = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [
      totalPatients,
      totalUsers,
      todayVisits,
      pendingLabOrders,
      pendingPrescriptions,
      admittedPatients,
      pendingAdmissions
    ] = await Promise.all([
      prisma.patient.count(),
      prisma.user.count(),
      prisma.attendanceLog.count({ where: { visit_date: { gte: today } } }),
      prisma.labOrder.count({ where: { status: 'Pending' } }),
      prisma.prescription.count({ where: { status: 'Pending' } }),
      prisma.admission.count({ where: { admission_status: 'Admitted' } }),
      prisma.admission.count({ where: { admission_status: 'Pending' } })
    ]);

    res.json({
      totalPatients,
      totalUsers,
      todayVisits,
      pendingLabOrders,
      pendingPrescriptions,
      admittedPatients,
      pendingAdmissions
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch system stats' });
  }
};

// ============== VISIT ANALYTICS ==============

const getVisitAnalytics = async (req, res) => {
  const { period = '7d' } = req.query;
  
  try {
    // Calculate date range
    const now = new Date();
    let startDate = new Date();
    
    switch (period) {
      case '30d':
        startDate.setDate(now.getDate() - 30);
        break;
      case '90d':
        startDate.setDate(now.getDate() - 90);
        break;
      default: // 7d
        startDate.setDate(now.getDate() - 7);
    }
    startDate.setHours(0, 0, 0, 0);

    // Get visits in date range
    const visits = await prisma.attendanceLog.findMany({
      where: { visit_date: { gte: startDate } },
      select: {
        visit_id: true,
        visit_date: true,
        visit_time: true,
        visit_type: true,
        is_emergency: true,
        queue_status: true
      }
    });

    // Aggregate by date
    const dailyStats = {};
    const visitTypes = { 'Walk-in': 0, 'Appointment': 0, 'Follow-up': 0 };
    const hourlyDistribution = Array(24).fill(0);

    visits.forEach(v => {
      // Daily aggregation
      const dateKey = new Date(v.visit_date).toISOString().split('T')[0];
      if (!dailyStats[dateKey]) {
        dailyStats[dateKey] = { date: dateKey, total: 0, emergency: 0 };
      }
      dailyStats[dateKey].total++;
      if (v.is_emergency) dailyStats[dateKey].emergency++;

      // Visit type aggregation
      if (visitTypes[v.visit_type] !== undefined) {
        visitTypes[v.visit_type]++;
      }

      // Hourly distribution
      const hour = new Date(v.visit_time).getHours();
      hourlyDistribution[hour]++;
    });

    // Convert to arrays for charts
    const dailyTrend = Object.values(dailyStats).sort((a, b) => a.date.localeCompare(b.date));
    const visitTypeBreakdown = Object.entries(visitTypes).map(([name, value]) => ({ name, value }));
    const peakHours = hourlyDistribution.map((count, hour) => ({
      hour: `${hour.toString().padStart(2, '0')}:00`,
      count
    }));

    res.json({
      dailyTrend,
      visitTypeBreakdown,
      peakHours,
      totalVisits: visits.length,
      emergencyRate: visits.length > 0 
        ? Math.round((visits.filter(v => v.is_emergency).length / visits.length) * 100) 
        : 0
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch visit analytics' });
  }
};

// ============== PATIENT ANALYTICS ==============

const getPatientAnalytics = async (req, res) => {
  try {
    const patients = await prisma.patient.findMany({
      select: {
        patient_id: true,
        date_of_birth: true,
        gender: true,
        patient_type: true,
        date_registered: true
      }
    });

    // Age distribution
    const ageGroups = { '0-17': 0, '18-35': 0, '36-50': 0, '51-65': 0, '65+': 0 };
    const now = new Date();
    
    patients.forEach(p => {
      if (p.date_of_birth) {
        const age = Math.floor((now - new Date(p.date_of_birth)) / (365.25 * 24 * 60 * 60 * 1000));
        if (age < 18) ageGroups['0-17']++;
        else if (age <= 35) ageGroups['18-35']++;
        else if (age <= 50) ageGroups['36-50']++;
        else if (age <= 65) ageGroups['51-65']++;
        else ageGroups['65+']++;
      }
    });

    // Gender distribution
    const genderDist = {};
    patients.forEach(p => {
      const g = p.gender || 'Unknown';
      genderDist[g] = (genderDist[g] || 0) + 1;
    });

    // Patient type distribution
    const typeDist = {};
    patients.forEach(p => {
      typeDist[p.patient_type] = (typeDist[p.patient_type] || 0) + 1;
    });

    // Registration trend (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const registrationTrend = {};
    patients.forEach(p => {
      if (new Date(p.date_registered) >= thirtyDaysAgo) {
        const dateKey = new Date(p.date_registered).toISOString().split('T')[0];
        registrationTrend[dateKey] = (registrationTrend[dateKey] || 0) + 1;
      }
    });

    res.json({
      totalPatients: patients.length,
      ageDistribution: Object.entries(ageGroups).map(([name, value]) => ({ name, value })),
      genderDistribution: Object.entries(genderDist).map(([name, value]) => ({ name, value })),
      typeDistribution: Object.entries(typeDist).map(([name, value]) => ({ name, value })),
      registrationTrend: Object.entries(registrationTrend)
        .map(([date, count]) => ({ date, count }))
        .sort((a, b) => a.date.localeCompare(b.date))
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch patient analytics' });
  }
};

// ============== CLINICAL ANALYTICS ==============

const getClinicalAnalytics = async (req, res) => {
  try {
    // Top diagnoses
    const visits = await prisma.attendanceLog.findMany({
      where: { diagnosis: { not: null } },
      select: { diagnosis: true }
    });

    const diagnosisCounts = {};
    visits.forEach(v => {
      if (v.diagnosis) {
        // Split multiple diagnoses if separated by comma or semicolon
        const diagnoses = v.diagnosis.split(/[,;]/).map(d => d.trim());
        diagnoses.forEach(d => {
          if (d) diagnosisCounts[d] = (diagnosisCounts[d] || 0) + 1;
        });
      }
    });

    const topDiagnoses = Object.entries(diagnosisCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Admission stats
    const admissions = await prisma.admission.findMany({
      include: { ward: true }
    });

    const wardStats = {};
    let totalStayDays = 0;
    let dischargedCount = 0;

    admissions.forEach(a => {
      const wardName = a.ward?.ward_name || 'Unknown';
      wardStats[wardName] = (wardStats[wardName] || 0) + 1;

      if (a.admission_status === 'Discharged' && a.admitted_at && a.discharged_at) {
        const days = (new Date(a.discharged_at) - new Date(a.admitted_at)) / (1000 * 60 * 60 * 24);
        totalStayDays += days;
        dischargedCount++;
      }
    });

    // Lab order stats
    const labOrders = await prisma.labOrder.groupBy({
      by: ['status'],
      _count: true
    });

    // Prescription stats
    const prescriptions = await prisma.prescription.groupBy({
      by: ['status'],
      _count: true
    });

    res.json({
      topDiagnoses,
      admissionsByWard: Object.entries(wardStats).map(([name, count]) => ({ name, count })),
      avgStayDuration: dischargedCount > 0 ? Math.round(totalStayDays / dischargedCount * 10) / 10 : 0,
      totalAdmissions: admissions.length,
      labOrderStats: labOrders.map(l => ({ status: l.status, count: l._count })),
      prescriptionStats: prescriptions.map(p => ({ status: p.status, count: p._count }))
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch clinical analytics' });
  }
};

// ============== STAFF PERFORMANCE ==============

const getStaffPerformance = async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      select: { user_id: true, username: true, role: true }
    });

    const userMap = {};
    users.forEach(u => userMap[u.user_id] = u);

    // Doctor consultations (visits with doctor notes)
    const consultations = await prisma.attendanceLog.findMany({
      where: { queue_status: 'Completed' },
      select: { visit_id: true }
    });

    // Prescriptions by pharmacist
    const prescriptions = await prisma.prescription.findMany({
      where: { pharmacist_id: { not: null } },
      select: { pharmacist_id: true }
    });

    const pharmacistStats = {};
    prescriptions.forEach(p => {
      if (p.pharmacist_id) {
        const user = userMap[p.pharmacist_id];
        const name = user?.username || `User ${p.pharmacist_id}`;
        pharmacistStats[name] = (pharmacistStats[name] || 0) + 1;
      }
    });

    // Lab orders by technician
    const labOrders = await prisma.labOrder.findMany({
      where: { technician_id: { not: null } },
      select: { technician_id: true }
    });

    const labTechStats = {};
    labOrders.forEach(l => {
      if (l.technician_id) {
        const user = userMap[l.technician_id];
        const name = user?.username || `User ${l.technician_id}`;
        labTechStats[name] = (labTechStats[name] || 0) + 1;
      }
    });

    // Staff by role
    const staffByRole = {};
    users.forEach(u => {
      staffByRole[u.role] = (staffByRole[u.role] || 0) + 1;
    });

    res.json({
      totalConsultations: consultations.length,
      pharmacistPerformance: Object.entries(pharmacistStats)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count),
      labTechPerformance: Object.entries(labTechStats)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count),
      staffByRole: Object.entries(staffByRole).map(([role, count]) => ({ role, count }))
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch staff performance' });
  }
};

// ============== ACTIVITY LOGS ==============

const getActivityLogs = async (req, res) => {
  const { 
    limit = 100, 
    action, 
    userId, 
    entity,
    startDate,
    endDate,
    role
  } = req.query;

  try {
    const where = {};
    
    // Action filter
    if (action && action !== 'all') {
      where.action = action;
    }
    
    // User filter
    if (userId && userId !== 'all') {
      where.user_id = parseInt(userId);
    }
    
    // Entity filter
    if (entity && entity !== 'all') {
      where.entity = entity;
    }
    
    // Date range filter
    if (startDate || endDate) {
      where.created_at = {};
      if (startDate) {
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        where.created_at.gte = start;
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        where.created_at.lte = end;
      }
    }

    const logs = await prisma.receptionAudit.findMany({
      where,
      orderBy: { created_at: 'desc' },
      take: parseInt(limit)
    });

    // Get user info for logs
    const userIds = [...new Set(logs.map(l => l.user_id).filter(Boolean))];
    let users = [];
    if (userIds.length > 0) {
      const userWhere = {};
      if (role && role !== 'all') {
        userWhere.role = role;
      }
      users = await prisma.user.findMany({
        where: { 
          user_id: { in: userIds },
          ...userWhere
        },
        select: { user_id: true, username: true, role: true }
      });
    }
    
    const userMap = {};
    users.forEach(u => userMap[u.user_id] = u);

    // Filter logs by role if specified
    let enrichedLogs = logs.map(log => ({
      ...log,
      user: userMap[log.user_id] || null
    }));
    
    if (role && role !== 'all') {
      enrichedLogs = enrichedLogs.filter(log => log.user?.role === role);
    }

    res.json(enrichedLogs);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch activity logs', details: error.message });
  }
};

// ============== PATIENT FLOW ==============

const getPatientFlow = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Get today's visits with status breakdown
    const visits = await prisma.attendanceLog.findMany({
      where: { visit_date: { gte: today } },
      include: {
        patient: {
          select: { first_name: true, last_name: true }
        }
      },
      orderBy: { queue_number: 'asc' }
    });

    // Categorize by status
    const flow = {
      waiting: visits.filter(v => v.queue_status === 'Waiting'),
      inVitals: visits.filter(v => v.queue_status === 'In Vitals' || v.queue_status === 'Vitals Complete'),
      withDoctor: visits.filter(v => v.queue_status === 'With Doctor'),
      pendingAdmission: visits.filter(v => v.queue_status === 'Pending Admission'),
      admitted: visits.filter(v => v.queue_status === 'Admitted'),
      completed: visits.filter(v => v.queue_status === 'Completed' || v.queue_status === 'Discharged')
    };

    // Summary counts
    const summary = {
      total: visits.length,
      waiting: flow.waiting.length,
      inProgress: flow.inVitals.length + flow.withDoctor.length,
      pendingAdmission: flow.pendingAdmission.length,
      admitted: flow.admitted.length,
      completed: flow.completed.length
    };

    res.json({ flow, summary });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch patient flow' });
  }
};

// ============== USER MANAGEMENT ==============

const getUsers = async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        user_id: true,
        name: true,
        staff_id: true,
        username: true,
        role: true,
        created_at: true
      },
      orderBy: { created_at: 'desc' }
    });
    res.json(users);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
};

const updateUserRole = async (req, res) => {
  const { id } = req.params;
  const { role } = req.body;

  try {
    const beforeUser = await prisma.user.findUnique({
      where: { user_id: parseInt(id) }
    });
    
    const user = await prisma.user.update({
      where: { user_id: parseInt(id) },
      data: { role }
    });
    
    // Log the role change
    await logAction({
      userId: req.user.userId,
      action: 'UPDATE_USER_ROLE',
      entity: 'User',
      entityId: user.user_id,
      beforeSnapshot: beforeUser ? { role: beforeUser.role } : null,
      afterSnapshot: { role: user.role, username: user.username }
    });
    
    res.json(user);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update user role' });
  }
};

const deleteUser = async (req, res) => {
  const { id } = req.params;

  try {
    const beforeUser = await prisma.user.findUnique({
      where: { user_id: parseInt(id) }
    });
    
    await prisma.user.delete({
      where: { user_id: parseInt(id) }
    });
    
    // Log the deletion
    await logAction({
      userId: req.user.userId,
      action: 'DELETE_USER',
      entity: 'User',
      entityId: parseInt(id),
      beforeSnapshot: beforeUser ? { username: beforeUser.username, role: beforeUser.role } : null
    });
    
    res.json({ message: 'User deleted' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to delete user' });
  }
};

// Create new user (admin only)
const createUser = async (req, res) => {
  const { name, staff_id, password, role } = req.body;

  if (!name || !staff_id || !password || !role) {
    return res.status(400).json({ error: 'Name, Staff ID, password, and role are required' });
  }

  const validRoles = ['admin', 'doctor', 'nurse', 'receptionist', 'lab_tech', 'pharmacist'];
  if (!validRoles.includes(role)) {
    return res.status(400).json({ error: 'Invalid role' });
  }

  try {
    const bcrypt = require('bcryptjs');
    const hashedPassword = await bcrypt.hash(password, 10);

    // Auto-generate username from staff_id for backwards compatibility
    const username = staff_id;

    const user = await prisma.user.create({
      data: {
        name: name.trim(),
        staff_id: staff_id.trim(),
        username,
        password_hash: hashedPassword,
        role
      }
    });

    // Log the user creation
    await logAction({
      userId: req.user.userId,
      action: 'CREATE_USER',
      entity: 'User',
      entityId: user.user_id,
      afterSnapshot: { name: user.name, staff_id: user.staff_id, role: user.role }
    });

    res.status(201).json({
      message: 'User created successfully',
      user: { 
        user_id: user.user_id, 
        name: user.name, 
        staff_id: user.staff_id, 
        role: user.role 
      }
    });
  } catch (error) {
    console.error(error);
    if (error.code === 'P2002') {
      // Check which field caused the conflict
      if (error.meta?.target?.includes('staff_id')) {
        return res.status(409).json({ error: 'Staff ID already exists' });
      }
      return res.status(409).json({ error: 'User already exists' });
    }
    res.status(500).json({ error: 'Failed to create user' });
  }
};

// Reset user password (admin only)
const resetPassword = async (req, res) => {
  const { id } = req.params;
  const { newPassword } = req.body;

  if (!newPassword) {
    return res.status(400).json({ error: 'New password is required' });
  }

  try {
    const bcrypt = require('bcryptjs');
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await prisma.user.update({
      where: { user_id: parseInt(id) },
      data: { password_hash: hashedPassword }
    });

    res.json({ message: 'Password reset successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to reset password' });
  }
};

module.exports = {
  getSystemStats,
  getVisitAnalytics,
  getPatientAnalytics,
  getClinicalAnalytics,
  getStaffPerformance,
  getActivityLogs,
  getPatientFlow,
  getUsers,
  createUser,
  updateUserRole,
  resetPassword,
  deleteUser
};
