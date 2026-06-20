const prisma = require('../config/database');

/**
 * Validates and orchestrates the state transitions for Patient Visits
 * and their optionally linked Appointments.
 */
class VisitStateMachine {

    /**
     * Determine the initial state and handle side-effects of a check-in.
     * @param {Object} params
     * @param {boolean} params.isEmergency - Whether the visit is marked as emergency
     * @param {number|null} params.appointmentId - Linked appointment ID, if any
     * @param {Object} tx - Prisma transaction object
     * @returns {string} The initial queue_status for the AttendanceLog
     */
    async getInitialState({ isEmergency, appointmentId }, tx) {
        const queueStatus = isEmergency ? 'Emergency' : 'Waiting';

        if (appointmentId) {
            // If linked to an appointment, transition the Appointment to "Checked In"
            await tx.appointment.update({
                where: { appointment_id: parseInt(appointmentId) },
                data: { status: 'Checked In' }
            });
        }

        return queueStatus;
    }

    /**
     * Determine the state and handle side-effects after a nurse completes vitals/triage
     * @param {Object} visit - The updated AttendanceLog record (needs appointment_id)
     * @param {Object} params
     * @param {string} params.nextStep - 'discharge' | 'treat_by_nurse' | etc.
     * @param {string} params.triageLevel - 'Red' | 'Yellow' | 'Green'
     * @returns {string} The new queue_status for the AttendanceLog
     */
    async afterNurseTriage(visit, { nextStep, triageLevel }) {
        let newStatus = 'Ready for Doctor'; // Default

        // Determine status based on next_step or triage
        if (nextStep === 'discharge') {
            newStatus = 'Completed';
        } else if (nextStep === 'treat_by_nurse') {
            newStatus = 'In Progress';
        } else if (triageLevel === 'Red') {
            newStatus = 'Emergency';
        }

        // If the patient is ready for the doctor AND they have an appointment,
        // transition the Appointment to "Vitals Complete" so it appears ready in the doctor's appointment tab.
        if ((newStatus === 'Ready for Doctor' || newStatus === 'Emergency') && visit.appointment_id) {
            await prisma.appointment.update({
                where: { appointment_id: visit.appointment_id },
                data: { status: 'Vitals Complete' }
            });
        }

        // If discharged, transition appointment to Completed
        if (newStatus === 'Completed' && visit.appointment_id) {
            await prisma.appointment.update({
                where: { appointment_id: visit.appointment_id },
                data: { status: 'Completed' }
            });
        }

        return newStatus;
    }
}

module.exports = new VisitStateMachine();
