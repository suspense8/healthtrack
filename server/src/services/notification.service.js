/**
 * Notification Service
 * 
 * Manages real-time push notifications between modules using Socket.IO
 * Includes navigation URLs for clickable notifications
 */

let io = null;

/**
 * Initialize the notification service with Socket.IO instance
 */
function initialize(socketIO) {
  io = socketIO;
  console.log('✅ Notification service initialized');
}

/**
 * Get the Socket.IO instance
 */
function getIO() {
  if (!io) {
    throw new Error('Notification service not initialized. Call initialize() first.');
  }
  return io;
}

/**
 * Notification types for different events
 */
const NotificationType = {
  PATIENT_QUEUED: 'patient_queued',
  PATIENT_CHECKED_IN: 'patient_checked_in',
  VITALS_COMPLETE: 'vitals_complete',
  READY_FOR_DOCTOR: 'ready_for_doctor',
  CONSULTATION_COMPLETE: 'consultation_complete',
  LAB_ORDER_CREATED: 'lab_order_created',
  PRESCRIPTION_CREATED: 'prescription_created',
  ADMISSION_REQUESTED: 'admission_requested',
  ADMISSION_ACCEPTED: 'admission_accepted',
  PATIENT_ADMITTED: 'patient_admitted',
  PATIENT_DISCHARGED: 'patient_discharged',
  LAB_RESULTS_READY: 'lab_results_ready',
  PRESCRIPTION_DISPENSED: 'prescription_dispensed'
};

/**
 * Send notification to a specific role room
 */
function notify(role, notification) {
  if (!io) {
    console.warn('Notification service not initialized');
    return;
  }

  const payload = {
    ...notification,
    timestamp: new Date().toISOString(),
    id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  };

  io.to(`room:${role}`).emit('notification', payload);
  console.log(`📨 Notification sent to ${role}:`, payload.title);
}

/**
 * Broadcast to all connected clients
 */
function broadcast(notification) {
  if (!io) return;
  
  const payload = {
    ...notification,
    timestamp: new Date().toISOString(),
    id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  };

  io.emit('notification', payload);
  console.log(`📢 Broadcast notification:`, payload.title);
}

// ============== WORKFLOW NOTIFICATIONS ==============

/**
 * Reception → Nurse: New patient in queue
 */
function notifyPatientQueued(patient, queueNumber, isEmergency = false) {
  notify('nurse', {
    type: NotificationType.PATIENT_QUEUED,
    title: isEmergency ? '🚨 EMERGENCY Patient' : 'New Patient in Queue',
    message: `${patient.first_name} ${patient.last_name} - Queue #${queueNumber}`,
    data: { patient_id: patient.patient_id, queue_number: queueNumber, is_emergency: isEmergency },
    navigateTo: '/nurse',
    tab: 'queue'
  });
}

/**
 * Nurse → Doctor: Patient ready for consultation (vitals complete)
 */
function notifyReadyForDoctor(patient, visitId) {
  notify('doctor', {
    type: NotificationType.READY_FOR_DOCTOR,
    title: '🩺 Patient Ready for Consultation',
    message: `${patient.first_name} ${patient.last_name} - Vitals complete`,
    data: { patient_id: patient.patient_id, visit_id: visitId },
    navigateTo: '/doctor',
    tab: 'consultation'
  });
}

/**
 * Doctor → Pharmacy: New prescription
 */
function notifyPrescriptionCreated(patient, prescriptionCount) {
  notify('pharmacy', {
    type: NotificationType.PRESCRIPTION_CREATED,
    title: '💊 New Prescription',
    message: `${patient.first_name} ${patient.last_name} - ${prescriptionCount} medication(s)`,
    data: { patient_id: patient.patient_id },
    navigateTo: '/pharmacy',
    tab: 'queue'
  });
}

/**
 * Doctor → Lab: New lab order
 */
function notifyLabOrderCreated(patient, testType, urgency) {
  notify('lab', {
    type: NotificationType.LAB_ORDER_CREATED,
    title: urgency === 'Stat' ? '🚨 URGENT Lab Order' : '🔬 New Lab Order',
    message: `${patient.first_name} ${patient.last_name} - ${testType}`,
    data: { patient_id: patient.patient_id, test_type: testType, urgency },
    navigateTo: '/lab',
    tab: 'queue'
  });
}

/**
 * Doctor → Nurse: Admission request
 */
function notifyAdmissionRequested(patient, wardName) {
  notify('nurse', {
    type: NotificationType.ADMISSION_REQUESTED,
    title: '🏥 Admission Request',
    message: `${patient.first_name} ${patient.last_name} → ${wardName}`,
    data: { patient_id: patient.patient_id },
    navigateTo: '/nurse',
    tab: 'admissions'
  });
}

/**
 * Nurse → Doctor: Patient admitted
 */
function notifyPatientAdmitted(patient, wardName, bedNumber) {
  notify('doctor', {
    type: NotificationType.PATIENT_ADMITTED,
    title: '✅ Patient Admitted',
    message: `${patient.first_name} ${patient.last_name} → ${wardName} (Bed ${bedNumber})`,
    data: { patient_id: patient.patient_id },
    navigateTo: '/doctor',
    tab: 'admitted'
  });
}

/**
 * Nurse → Doctor: Patient discharged
 */
function notifyPatientDischarged(patient) {
  notify('doctor', {
    type: NotificationType.PATIENT_DISCHARGED,
    title: '👋 Patient Discharged',
    message: `${patient.first_name} ${patient.last_name} has been discharged`,
    data: { patient_id: patient.patient_id },
    navigateTo: '/doctor',
    tab: 'admitted'
  });
}

/**
 * Lab → Doctor: Lab results ready
 */
function notifyLabResultsReady(patient, testType) {
  notify('doctor', {
    type: NotificationType.LAB_RESULTS_READY,
    title: '📋 Lab Results Ready',
    message: `${patient.first_name} ${patient.last_name} - ${testType}`,
    data: { patient_id: patient.patient_id },
    navigateTo: '/doctor',
    tab: 'patients'
  });
}

/**
 * Pharmacy → Doctor: Medication dispensed
 */
function notifyPrescriptionDispensed(patient) {
  notify('doctor', {
    type: NotificationType.PRESCRIPTION_DISPENSED,
    title: '✅ Medication Dispensed',
    message: `${patient.first_name} ${patient.last_name} - Prescription complete`,
    data: { patient_id: patient.patient_id },
    navigateTo: '/doctor',
    tab: 'prescriptions'
  });
}

module.exports = {
  initialize,
  getIO,
  notify,
  broadcast,
  NotificationType,
  // Workflow notifications
  notifyPatientQueued,
  notifyReadyForDoctor,
  notifyPrescriptionCreated,
  notifyLabOrderCreated,
  notifyAdmissionRequested,
  notifyPatientAdmitted,
  notifyPatientDischarged,
  notifyLabResultsReady,
  notifyPrescriptionDispensed
};
