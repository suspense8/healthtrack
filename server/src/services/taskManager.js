/**
 * Task Management Service
 * Handles automatic task creation and assignment for emergency obstetric workflow
 */

const prisma = require('@prisma/client').PrismaClient;

class TaskManager {
  /**
   * Create a triage task for emergency obstetric visit
   * @param {number} visitId - Visit ID
   * @param {string} priority - "normal" | "urgent" | "critical"
   * @returns {Promise<object>} Created task
   */
  static async createTriageTask(visitId, priority = 'critical') {
    return await prisma.task.create({
      data: {
        visit_id: visitId,
        task_type: 'TRIAGE',
        assigned_role: 'nurse',
        priority,
        status: 'pending',
        description: 'Emergency obstetric triage required',
        due_at: new Date(Date.now() + 5 * 60 * 1000) // 5 minutes from now
      }
    });
  }

  /**
   * Create doctor review task after triage completion
   * @param {number} visitId - Visit ID
   * @param {string} priority - Based on triage findings
   * @param {string} triageSummary - Brief summary from nurse
   * @returns {Promise<object>} Created task
   */
  static async createDoctorReviewTask(visitId, priority, triageSummary) {
    return await prisma.task.create({
      data: {
        visit_id: visitId,
        task_type: 'DOCTOR_REVIEW',
        assigned_role: 'doctor',
        priority,
        status: 'pending',
        description: `Obstetric review needed: ${triageSummary}`,
        due_at: new Date(Date.now() + 10 * 60 * 1000) // 10 minutes
      }
    });
  }

  /**
   * Create delivery task
   * @param {number} visitId - Visit ID
   * @param {number} nurseUserId - Nurse who will assist
   * @returns {Promise<object>} Created task
   */
  static async createDeliveryTask(visitId, nurseUserId = null) {
    return await prisma.task.create({
      data: {
        visit_id: visitId,
        task_type: 'DELIVERY',
        assigned_role: 'nurse',
        assigned_user_id: nurseUserId,
        priority: 'critical',
        status: 'pending',
        description: 'Assist with delivery',
        due_at: new Date() // Immediate
      }
    });
  }

  /**
   * Create postpartum monitoring task
   * @param {number} visitId - Visit ID
   * @param {number} intervalMinutes - Monitoring interval
   * @returns {Promise<object>} Created task
   */
  static async createPostpartumMonitorTask(visitId, intervalMinutes = 30) {
    return await prisma.task.create({
      data: {
        visit_id: visitId,
        task_type: 'POSTPARTUM_MONITOR',
        assigned_role: 'nurse',
        priority: 'urgent',
        status: 'pending',
        description: `Postpartum vitals check (every ${intervalMinutes} min)`,
        due_at: new Date(Date.now() + intervalMinutes * 60 * 1000)
      }
    });
  }

  /**
   * Create billing task after delivery
   * @param {number} visitId - Visit ID
   * @returns {Promise<object>} Created task
   */
  static async createBillingTask(visitId) {
    return await prisma.task.create({
      data: {
        visit_id: visitId,
        task_type: 'BILLING',
        assigned_role: 'receptionist',
        priority: 'normal',
        status: 'pending',
        description: 'Process delivery billing and birth registration',
        due_at: new Date(Date.now() + 60 * 60 * 1000) // 1 hour
      }
    });
  }

  /**
   * Complete a task
   * @param {number} taskId - Task ID
   * @param {number} userId - User completing the task
   * @param {string} notes - Optional completion notes
   * @returns {Promise<object>} Updated task
   */
  static async completeTask(taskId, userId, notes = null) {
    return await prisma.task.update({
      where: { task_id: taskId },
      data: {
        status: 'completed',
        completed_at: new Date(),
        completed_by_user_id: userId,
        notes: notes || undefined
      }
    });
  }

  /**
   * Start working on a task
   * @param {number} taskId - Task ID
   * @param {number} userId - User starting the task
   * @returns {Promise<object>} Updated task
   */
  static async startTask(taskId, userId) {
    return await prisma.task.update({
      where: { task_id: taskId },
      data: {
        status: 'in_progress',
        started_at: new Date(),
        assigned_user_id: userId
      }
    });
  }

  /**
   * Get pending tasks for a role
   * @param {string} role - "nurse" | "doctor" | "receptionist"
   * @returns {Promise<Array>} List of pending tasks with visit data
   */
  static async getPendingTasksForRole(role) {
    return await prisma.task.findMany({
      where: {
        assigned_role: role,
        status: { in: ['pending', 'in_progress'] }
      },
      include: {
        visit: {
          include: {
            patient: {
              select: {
                first_name: true,
                last_name: true,
                age: true
              }
            },
            obstetric_visit: true
          }
        }
      },
      orderBy: [
        { priority: 'desc' }, // critical first
        { created_at: 'asc' }
      ]
    });
  }

  /**
   * Get overdue tasks (past due_at time)
   * @returns {Promise<Array>} List of overdue tasks
   */
  static async getOverdueTasks() {
    return await prisma.task.findMany({
      where: {
        status: 'pending',
        due_at: {
          lt: new Date()
        }
      },
      include: {
        visit: {
          include: {
            patient: true
          }
        }
      },
      orderBy: { due_at: 'asc' }
    });
  }
}

module.exports = TaskManager;
