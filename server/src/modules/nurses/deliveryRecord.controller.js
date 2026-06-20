const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const TaskManager = require('../../services/taskManager');

/**
 * Record Delivery
 * POST /api/nurses/record-delivery/:visitId
 */
const recordDelivery = async (req, res) => {
  const { visitId } = req.params;
  const { delivery_time, delivery_type, newborn, maternal, notes, task_id } = req.body;

  try {
    const obstetricVisit = await prisma.obstetricVisit.findUnique({
      where: { visit_id: parseInt(visitId) }
    });

    if (!obstetricVisit) {
      return res.status(404).json({ error: 'Obstetric visit not found' });
    }

    // Create delivery record
    const delivery = await prisma.delivery.create({
      data: {
        obstetric_visit_id: obstetricVisit.obstetric_visit_id,
        delivery_time: new Date(delivery_time),
        delivery_type,
        conducted_by_user_id: req.user.userId,
        baby_sex: newborn.sex,
        birth_weight_grams: newborn.birth_weight_grams,
        apgar_1_min: newborn.apgar_1_min,
        apgar_5_min: newborn.apgar_5_min,
        resuscitation_needed: newborn.resuscitation_needed || false,
        resuscitation_details: newborn.resuscitation_details,
        placenta_delivered: maternal.placenta_delivered,
        placenta_delivery_time: maternal.placenta_delivery_time ? new Date(maternal.placenta_delivery_time) : null,
        estimated_blood_loss_ml: maternal.estimated_blood_loss_ml,
        perineal_tear: maternal.perineal_tear,
        complications: maternal.complications,
        postpartum_bp_systolic: maternal.postpartum_bp_systolic,
        postpartum_bp_diastolic: maternal.postpartum_bp_diastolic,
        uterus_firm: maternal.uterus_firm,
        excessive_bleeding: maternal.excessive_bleeding || false,
        notes
      }
    });

    // Update visit status
    await prisma.attendanceLog.update({
      where: { visit_id: parseInt(visitId) },
      data: {
        queue_status: 'Delivered',
        disposition: 'Admitted' // Post-delivery observation
      }
    });

    // Complete delivery task
    if (task_id) {
      await TaskManager.completeTask(parseInt(task_id), req.user.userId, 'Delivery completed');
    }

    // Create postpartum monitoring task (30-minute intervals)
    const postpartumTask = await TaskManager.createPostpartumMonitorTask(parseInt(visitId), 30);

    // Create billing task for reception
    const billingTask = await TaskManager.createBillingTask(parseInt(visitId));

    // Emit notifications
    const io = req.app.get('io');
    if (io) {
      // Notify reception for billing
      io.to('receptionist').emit('delivery:billing_needed', {
        visitId: parseInt(visitId),
        deliveryId: delivery.delivery_id,
        taskId: billingTask.task_id
      });

      // If complications or excessive bleeding, alert doctor
      if (maternal.excessive_bleeding || maternal.complications) {
        io.to('doctor').emit('delivery:complication_alert', {
          visitId: parseInt(visitId),
          deliveryId: delivery.delivery_id,
          excessiveBleeding: maternal.excessive_bleeding,
          complications: maternal.complications
        });
      }
    }

    // Log action (audit logging can be added later)

    res.status(201).json({
      message: 'Delivery recorded successfully',
      delivery_id: delivery.delivery_id,
      postpartum_task_id: postpartumTask.task_id,
      billing_task_id: billingTask.task_id
    });

  } catch (error) {
    console.error('Record delivery error:', error);
    res.status(500).json({ error: 'Failed to record delivery' });
  }
};

/**
 * Get Delivery Details
 * GET /api/nurses/delivery/:deliveryId
 */
const getDeliveryDetails = async (req, res) => {
  const { deliveryId } = req.params;

  try {
    const delivery = await prisma.delivery.findUnique({
      where: { delivery_id: parseInt(deliveryId) },
      include: {
        obstetric_visit: {
          include: {
            visit: {
              include: {
                patient: true
              }
            }
          }
        }
      }
    });

    if (!delivery) {
      return res.status(404).json({ error: 'Delivery not found' });
    }

    res.json(delivery);

  } catch (error) {
    console.error('Get delivery error:', error);
    res.status(500).json({ error: 'Failed to fetch delivery details' });
  }
};

/**
 * Get Today's Deliveries
 * GET /api/nurses/deliveries/today
 */
const getTodaysDeliveries = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const deliveries = await prisma.delivery.findMany({
      where: {
        delivery_time: {
          gte: today,
          lt: tomorrow
        }
      },
      include: {
        obstetric_visit: {
          include: {
            visit: {
              include: {
                patient: {
                  select: {
                    first_name: true,
                    last_name: true,
                    age: true
                  }
                }
              }
            }
          }
        }
      },
      orderBy: { delivery_time: 'desc' }
    });

    res.json(deliveries);

  } catch (error) {
    console.error('Get today deliveries error:', error);
    res.status(500).json({ error: 'Failed to fetch deliveries' });
  }
};

module.exports = {
  recordDelivery,
  getDeliveryDetails,
  getTodaysDeliveries
};
