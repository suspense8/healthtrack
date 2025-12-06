const prisma = require('../../config/database');

// Helper function to convert data to CSV format
const convertToCSV = (data, headers) => {
  if (!data || data.length === 0) {
    return headers.join(',') + '\n';
  }

  const csvRows = [];
  
  // Add headers
  csvRows.push(headers.join(','));
  
  // Add data rows
  data.forEach(row => {
    const values = headers.map(header => {
      const value = row[header] || '';
      // Escape commas and quotes in CSV
      if (typeof value === 'string' && (value.includes(',') || value.includes('"') || value.includes('\n'))) {
        return `"${value.replace(/"/g, '""')}"`;
      }
      return value;
    });
    csvRows.push(values.join(','));
  });
  
  return csvRows.join('\n');
};

// Export comprehensive student welfare data
const exportStudentWelfareData = async (req, res) => {
  const { startDate, endDate, format = 'csv', patientType = 'Student' } = req.query;
  
  try {
    // Build date filter
    const where = { patient_type: patientType };
    if (startDate || endDate) {
      where.visit_date = {};
      if (startDate) {
        where.visit_date.gte = new Date(startDate);
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        where.visit_date.lte = end;
      }
    }

    // Fetch comprehensive data
    const visits = await prisma.attendanceLog.findMany({
      where: startDate || endDate ? where : { patient: { patient_type: patientType } },
      include: {
        patient: {
          select: {
            patient_id: true,
            first_name: true,
            last_name: true,
            middle_name: true,
            date_of_birth: true,
            gender: true,
            national_id: true,
            patient_type: true,
            phone_number: true,
            email: true,
            address: true,
            allergies: true,
            existing_conditions: true,
            date_registered: true
          }
        },
        prescriptions: {
          select: {
            medication_name: true,
            dosage: true,
            frequency: true,
            duration: true,
            status: true,
            created_at: true
          }
        },
        lab_orders: {
          select: {
            test_type: true,
            urgency: true,
            status: true,
            results: true,
            created_at: true
          }
        }
      },
      orderBy: { visit_date: 'desc' }
    });

    // Transform data for export
    const exportData = visits.map(visit => {
      const patient = visit.patient;
      const age = patient.date_of_birth 
        ? Math.floor((new Date() - new Date(patient.date_of_birth)) / (365.25 * 24 * 60 * 60 * 1000))
        : null;

      return {
        // Patient Demographics
        'Student ID': patient.national_id || '',
        'First Name': patient.first_name || '',
        'Last Name': patient.last_name || '',
        'Middle Name': patient.middle_name || '',
        'Full Name': `${patient.first_name} ${patient.middle_name || ''} ${patient.last_name}`.trim(),
        'Date of Birth': patient.date_of_birth ? new Date(patient.date_of_birth).toISOString().split('T')[0] : '',
        'Age': age || '',
        'Gender': patient.gender || '',
        'Phone Number': patient.phone_number || '',
        'Email': patient.email || '',
        'Address': patient.address || '',
        'Allergies': patient.allergies || '',
        'Existing Conditions': patient.existing_conditions || '',
        'Date Registered': patient.date_registered ? new Date(patient.date_registered).toISOString().split('T')[0] : '',
        
        // Visit Information
        'Visit ID': visit.visit_id,
        'Visit Date': new Date(visit.visit_date).toISOString().split('T')[0],
        'Visit Time': new Date(visit.visit_time).toISOString().split('T')[1].split('.')[0],
        'Visit Type': visit.visit_type || '',
        'Visit Reason': visit.visit_reason || '',
        'Is Emergency': visit.is_emergency ? 'Yes' : 'No',
        'Queue Number': visit.queue_number,
        'Queue Status': visit.queue_status || '',
        'Triage Level': visit.triage_level || '',
        'Referred By': visit.referred_by || '',
        
        // Vitals
        'Systolic BP': visit.systolic_bp || '',
        'Diastolic BP': visit.diastolic_bp || '',
        'Heart Rate': visit.heart_rate || '',
        'Respiratory Rate': visit.respiratory_rate || '',
        'Temperature (°C)': visit.temperature || '',
        'Oxygen Saturation (%)': visit.oxygen_saturation || '',
        'Weight (kg)': visit.weight || '',
        'Height (cm)': visit.height || '',
        
        // Clinical Data
        'Symptoms': visit.symptoms || '',
        'Physical Exam': visit.physical_exam || '',
        'Diagnosis': visit.diagnosis || '',
        'Treatment Plan': visit.treatment_plan || '',
        'Doctor Notes': visit.doctor_notes || '',
        'Nurse Notes': visit.nurse_notes || '',
        'Disposition': visit.disposition || '',
        'Referral Destination': visit.referral_dest || '',
        
        // Prescriptions (comma-separated)
        'Prescriptions': visit.prescriptions.map(p => 
          `${p.medication_name} (${p.dosage}, ${p.frequency}, ${p.duration})`
        ).join('; ') || '',
        'Prescription Status': visit.prescriptions.map(p => p.status).join('; ') || '',
        
        // Lab Orders (comma-separated)
        'Lab Tests': visit.lab_orders.map(l => l.test_type).join('; ') || '',
        'Lab Test Urgency': visit.lab_orders.map(l => l.urgency).join('; ') || '',
        'Lab Test Status': visit.lab_orders.map(l => l.status).join('; ') || '',
        'Lab Results': visit.lab_orders.map(l => l.results || 'N/A').join('; ') || ''
      };
    });

    // Get headers
    const headers = Object.keys(exportData[0] || {});

    if (format === 'csv') {
      const csv = convertToCSV(exportData, headers);
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="student_welfare_export_${new Date().toISOString().split('T')[0]}.csv"`);
      res.send(csv);
    } else {
      // JSON format
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="student_welfare_export_${new Date().toISOString().split('T')[0]}.json"`);
      res.json(exportData);
    }
  } catch (error) {
    console.error('Export error:', error);
    res.status(500).json({ error: 'Failed to export data', details: error.message });
  }
};

// Export patient summary (one row per student)
const exportStudentSummary = async (req, res) => {
  const { patientType = 'Student' } = req.query;
  
  try {
    const patients = await prisma.patient.findMany({
      where: { patient_type: patientType },
      include: {
        visits: {
          select: {
            visit_id: true,
            visit_date: true,
            is_emergency: true,
            diagnosis: true,
            queue_status: true
          }
        },
        prescriptions: {
          select: {
            medication_name: true,
            created_at: true
          }
        },
        lab_orders: {
          select: {
            test_type: true,
            created_at: true
          }
        },
        appointments: {
          select: {
            scheduled_date: true,
            status: true
          }
        }
      }
    });

    const summaryData = patients.map(patient => {
      const age = patient.date_of_birth 
        ? Math.floor((new Date() - new Date(patient.date_of_birth)) / (365.25 * 24 * 60 * 60 * 1000))
        : null;

      const totalVisits = patient.visits.length;
      const emergencyVisits = patient.visits.filter(v => v.is_emergency).length;
      const completedVisits = patient.visits.filter(v => v.queue_status === 'Completed').length;
      const lastVisit = patient.visits.length > 0 
        ? patient.visits.sort((a, b) => new Date(b.visit_date) - new Date(a.visit_date))[0]
        : null;

      // Get unique diagnoses
      const diagnoses = [...new Set(patient.visits
        .filter(v => v.diagnosis)
        .map(v => v.diagnosis)
        .flatMap(d => d.split(/[,;]/).map(x => x.trim())))
      ].join('; ');

      return {
        'Student ID': patient.national_id || '',
        'First Name': patient.first_name || '',
        'Last Name': patient.last_name || '',
        'Full Name': `${patient.first_name} ${patient.middle_name || ''} ${patient.last_name}`.trim(),
        'Date of Birth': patient.date_of_birth ? new Date(patient.date_of_birth).toISOString().split('T')[0] : '',
        'Age': age || '',
        'Gender': patient.gender || '',
        'Phone Number': patient.phone_number || '',
        'Email': patient.email || '',
        'Address': patient.address || '',
        'Allergies': patient.allergies || '',
        'Existing Conditions': patient.existing_conditions || '',
        'Date Registered': patient.date_registered ? new Date(patient.date_registered).toISOString().split('T')[0] : '',
        'Total Visits': totalVisits,
        'Emergency Visits': emergencyVisits,
        'Completed Visits': completedVisits,
        'Last Visit Date': lastVisit ? new Date(lastVisit.visit_date).toISOString().split('T')[0] : '',
        'Last Visit Diagnosis': lastVisit?.diagnosis || '',
        'Common Diagnoses': diagnoses,
        'Total Prescriptions': patient.prescriptions.length,
        'Total Lab Tests': patient.lab_orders.length,
        'Total Appointments': patient.appointments.length,
        'Active Appointments': patient.appointments.filter(a => a.status === 'Scheduled').length
      };
    });

    const headers = Object.keys(summaryData[0] || {});
    const csv = convertToCSV(summaryData, headers);
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="student_summary_export_${new Date().toISOString().split('T')[0]}.csv"`);
    res.send(csv);
  } catch (error) {
    console.error('Export error:', error);
    res.status(500).json({ error: 'Failed to export summary data', details: error.message });
  }
};

// Export visit analytics data
const exportVisitAnalytics = async (req, res) => {
  const { startDate, endDate, patientType = 'Student' } = req.query;
  
  try {
    const where = { patient: { patient_type: patientType } };
    if (startDate || endDate) {
      where.visit_date = {};
      if (startDate) {
        where.visit_date.gte = new Date(startDate);
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        where.visit_date.lte = end;
      }
    }

    const visits = await prisma.attendanceLog.findMany({
      where,
      include: {
        patient: {
          select: {
            national_id: true,
            first_name: true,
            last_name: true,
            gender: true,
            date_of_birth: true
          }
        }
      },
      orderBy: { visit_date: 'desc' }
    });

    // Aggregate by date
    const dailyStats = {};
    visits.forEach(visit => {
      const dateKey = new Date(visit.visit_date).toISOString().split('T')[0];
      if (!dailyStats[dateKey]) {
        dailyStats[dateKey] = {
          date: dateKey,
          total: 0,
          emergency: 0,
          walkIn: 0,
          appointment: 0,
          completed: 0
        };
      }
      dailyStats[dateKey].total++;
      if (visit.is_emergency) dailyStats[dateKey].emergency++;
      if (visit.visit_type === 'Walk-in') dailyStats[dateKey].walkIn++;
      if (visit.visit_type === 'Appointment') dailyStats[dateKey].appointment++;
      if (visit.queue_status === 'Completed') dailyStats[dateKey].completed++;
    });

    const analyticsData = Object.values(dailyStats)
      .sort((a, b) => a.date.localeCompare(b.date))
      .map(stat => ({
        'Date': stat.date,
        'Total Visits': stat.total,
        'Emergency Visits': stat.emergency,
        'Walk-in Visits': stat.walkIn,
        'Appointment Visits': stat.appointment,
        'Completed Visits': stat.completed,
        'Emergency Rate (%)': stat.total > 0 ? ((stat.emergency / stat.total) * 100).toFixed(2) : '0.00'
      }));

    const headers = Object.keys(analyticsData[0] || {});
    const csv = convertToCSV(analyticsData, headers);
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="visit_analytics_export_${new Date().toISOString().split('T')[0]}.csv"`);
    res.send(csv);
  } catch (error) {
    console.error('Export error:', error);
    res.status(500).json({ error: 'Failed to export analytics data', details: error.message });
  }
};

module.exports = {
  exportStudentWelfareData,
  exportStudentSummary,
  exportVisitAnalytics
};





