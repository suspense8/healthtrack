/**
 * Notification Service
 * 
 * Manages real-time push notifications between modules using Socket.IO
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
  ADMISSION_ACCEPTED: 'admission_accepted'
};

/**
 * Send notification to a specific role room
 * 
 * @param {string} role - Target role (nurse, doctor, pharmacy, lab, admin)
 * @param {object} notification - Notification object
 * @param {string} notification.type - NotificationType
 * @param {string} notification.title - Short title
 * @param {string} notification.message - Detailed message
 * @param {object} notification.data - Additional data (patient info, ids, etc.)
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

// ============== HELPER FUNCTIONS ==============

/**
 * Notify nurses about new patient in queue
 */
function notifyPatientQueued(patient, queueNumber, isEmergency = false) {
  notify('nurse', {
    type: NotificationType.PATIENT_QUEUED,
    title: isEmergency ? '🚨 EMERGENCY Patient Added' : 'New Patient in Queue',
    message: `${patient.first_name} ${patient.last_name} - Queue #${queueNumber}`,
    data: { patient_id: patient.patient_id, queue_number: queueNumber, is_emergency: isEmergency }
  });
}

/**
 * Notify doctor that patient is ready for consultation
 */
function notifyReadyForDoctor(patient, visitId) {
  notify('doctor', {
    type: NotificationType.READY_FOR_DOCTOR,
    title: 'Patient Ready for Consultation',
    message: `${patient.first_name} ${patient.last_name} - Vitals complete`,
    data: { patient_id: patient.patient_id, visit_id: visitId }
  });
}

/**
 * Notify pharmacy about new prescription
 */
function notifyPrescriptionCreated(patient, prescriptionCount) {
  notify('pharmacy', {
    type: NotificationType.PRESCRIPTION_CREATED,
    title: 'New Prescription',
    message: `${patient.first_name} ${patient.last_name} - ${prescriptionCount} medication(s)`,
    data: { patient_id: patient.patient_id }
  });
}

/**
 * Notify lab about new order
 */
function notifyLabOrderCreated(patient, testType, urgency) {
  notify('lab', {
    type: NotificationType.LAB_ORDER_CREATED,
    title: urgency === 'Stat' ? '🚨 URGENT Lab Order' : 'New Lab Order',
    message: `${patient.first_name} ${patient.last_name} - ${testType}`,
    data: { patient_id: patient.patient_id, test_type: testType, urgency }
  });
}

/**
 * Notify nurse about admission request
 */
function notifyAdmissionRequested(patient, wardName) {
  notify('nurse', {
    type: NotificationType.ADMISSION_REQUESTED,
    title: 'Admission Request',
    message: `${patient.first_name} ${patient.last_name} → ${wardName}`,
    data: { patient_id: patient.patient_id }
  });
}

module.exports = {
  initialize,
  getIO,
  notify,
  broadcast,
  NotificationType,
  // Helper functions
  notifyPatientQueued,
  notifyReadyForDoctor,
  notifyPrescriptionCreated,
  notifyLabOrderCreated,
  notifyAdmissionRequested
};
