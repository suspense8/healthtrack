const prisma = require('../../config/database');

/**
 * Logs an action to the audit trail
 * @param {Object} params
 * @param {number} params.userId - User ID performing the action
 * @param {string} params.action - Action name (e.g., 'CREATE_PATIENT', 'UPDATE_VISIT_STATUS')
 * @param {string} params.entity - Entity type (e.g., 'Patient', 'Visit', 'Prescription')
 * @param {number} params.entityId - ID of the entity
 * @param {Object} params.beforeSnapshot - State before the action (optional)
 * @param {Object} params.afterSnapshot - State after the action (optional)
 * @param {string} params.details - Additional details (optional)
 */
const logAction = async ({ userId, action, entity, entityId, beforeSnapshot, afterSnapshot, details }) => {
  try {
    await prisma.receptionAudit.create({
      data: {
        user_id: userId || null,
        action,
        entity,
        entity_id: entityId || null,
        before_snapshot: beforeSnapshot ? JSON.stringify(beforeSnapshot) : null,
        after_snapshot: afterSnapshot ? JSON.stringify(afterSnapshot) : null,
      }
    });
  } catch (error) {
    // Don't throw - logging should never break the main flow
    console.error('Failed to log action:', error);
  }
};

module.exports = { logAction };





