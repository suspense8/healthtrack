const prisma = require('../../config/database');
const { logAction } = require('../shared/auditLogger');
const vectorSearchService = require('../../services/vectorSearch.service');

// Get pending prescriptions for pharmacy queue
const getPendingPrescriptions = async (req, res) => {
  try {
    const prescriptions = await prisma.prescription.findMany({
      where: {
        status: 'Pending'
      },
      include: {
        patient: {
          select: {
            patient_id: true,
            first_name: true,
            last_name: true,
            phone_number: true,
            date_of_birth: true,
            allergies: true
          }
        },
        visit: {
          select: {
            visit_id: true,
            visit_date: true,
            diagnosis: true,
            queue_number: true
          }
        },
        medicine: {
          select: {
            id: true,
            name: true,
            quantity: true,
            reorder_level: true,
            unit: true
          }
        }
      },
      orderBy: { created_at: 'asc' }
    });
    
    // Enrich with stock status
    const enrichedPrescriptions = prescriptions.map(rx => {
      const stockStatus = rx.medicine ? {
        available: rx.medicine.quantity,
        reorderLevel: rx.medicine.reorder_level,
        unit: rx.medicine.unit,
        isLowStock: rx.medicine.quantity <= rx.medicine.reorder_level,
        isOutOfStock: rx.medicine.quantity === 0
      } : null;
      
      return {
        ...rx,
        stockStatus
      };
    });
    
    res.json(enrichedPrescriptions);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch pending prescriptions' });
  }
};

// Get all prescriptions with filters
const getAllPrescriptions = async (req, res) => {
  const { status, date } = req.query;
  const where = {};

  if (status && status !== 'all') {
    where.status = status;
  }

  if (date) {
    const startDate = new Date(date);
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(date);
    endDate.setHours(23, 59, 59, 999);
    where.created_at = { gte: startDate, lte: endDate };
  }

  try {
    const prescriptions = await prisma.prescription.findMany({
      where,
      include: {
        patient: {
          select: {
            patient_id: true,
            first_name: true,
            last_name: true,
            phone_number: true
          }
        },
        visit: {
          select: {
            visit_id: true,
            visit_date: true,
            diagnosis: true
          }
        }
      },
      orderBy: { created_at: 'desc' }
    });
    res.json(prescriptions);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch prescriptions' });
  }
};

// Dispense a prescription
const dispensePrescription = async (req, res) => {
  const { id } = req.params;
  const { quantity_dispensed, notes } = req.body;

  try {
    // Get prescription with medicine info
    const prescription = await prisma.prescription.findUnique({
      where: { prescription_id: parseInt(id) },
      include: { medicine: true }
    });

    if (!prescription) {
      return res.status(404).json({ error: 'Prescription not found' });
    }

    const quantityToDispense = quantity_dispensed ? parseInt(quantity_dispensed) : prescription.quantity || 1;

    // Check stock if medicine is linked
    if (prescription.medicine_id && prescription.medicine) {
      if (prescription.medicine.quantity < quantityToDispense) {
        return res.status(400).json({ 
          error: 'Insufficient stock',
          available: prescription.medicine.quantity,
          requested: quantityToDispense,
          unit: prescription.medicine.unit
        });
      }

      // Decrement stock within transaction
      await prisma.$transaction(async (tx) => {
        // Update prescription
        await tx.prescription.update({
      where: { prescription_id: parseInt(id) },
      data: {
        status: 'Dispensed',
            quantity: quantityToDispense,
        pharmacist_id: req.user.userId
      }
    });

        // Decrement medicine stock
        await tx.medicine.update({
          where: { id: prescription.medicine_id },
          data: {
            quantity: {
              decrement: quantityToDispense
            }
          }
        });
      });
    } else {
      // No medicine link, just update prescription
      await prisma.prescription.update({
        where: { prescription_id: parseInt(id) },
        data: {
          status: 'Dispensed',
          quantity: quantityToDispense,
          pharmacist_id: req.user.userId
        }
      });
    }

    // Check if all prescriptions for this visit are dispensed
    const remainingPending = await prisma.prescription.count({
      where: {
        visit_id: prescription.visit_id,
        status: 'Pending'
      }
    });

    // If no more pending prescriptions, update visit status to Completed
    if (remainingPending === 0) {
      await prisma.attendanceLog.update({
        where: { visit_id: prescription.visit_id },
        data: { queue_status: 'Completed' }
      });
    }

    // Log the dispense action
    await logAction({
      userId: req.user.userId,
      action: 'DISPENSE_PRESCRIPTION',
      entity: 'Prescription',
      entityId: prescription.prescription_id,
      afterSnapshot: {
        medication: prescription.medication_name,
        status: 'Dispensed',
        quantity: quantityToDispense
      }
    });

    const updatedPrescription = await prisma.prescription.findUnique({
      where: { prescription_id: parseInt(id) }
    });

    res.json({ message: 'Prescription dispensed', prescription: updatedPrescription });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to dispense prescription' });
  }
};

// Mark prescription as stockout
const markStockout = async (req, res) => {
  const { id } = req.params;
  const { notes } = req.body;

  try {
    const prescription = await prisma.prescription.update({
      where: { prescription_id: parseInt(id) },
      data: {
        status: 'Stockout',
        instructions: notes ? `STOCKOUT: ${notes}` : 'STOCKOUT: Medication unavailable',
        pharmacist_id: req.user.userId
      }
    });

    // Log the stockout action
    await logAction({
      userId: req.user.userId,
      action: 'MARK_STOCKOUT',
      entity: 'Prescription',
      entityId: prescription.prescription_id,
      afterSnapshot: {
        medication: prescription.medication_name,
        status: 'Stockout',
        reason: notes
      }
    });

    res.json({ message: 'Marked as stockout', prescription });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to mark stockout' });
  }
};

// Cancel prescription
const cancelPrescription = async (req, res) => {
  const { id } = req.params;
  const { reason } = req.body;

  try {
    const prescription = await prisma.prescription.update({
      where: { prescription_id: parseInt(id) },
      data: {
        status: 'Cancelled',
        instructions: reason ? `CANCELLED: ${reason}` : 'CANCELLED',
        pharmacist_id: req.user.userId
      }
    });

    // Log the cancellation
    await logAction({
      userId: req.user.userId,
      action: 'CANCEL_PRESCRIPTION',
      entity: 'Prescription',
      entityId: prescription.prescription_id,
      afterSnapshot: {
        medication: prescription.medication_name,
        status: 'Cancelled',
        reason
      }
    });

    res.json({ message: 'Prescription cancelled', prescription });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to cancel prescription' });
  }
};

// Get pharmacy stats
const getPharmacyStats = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [
      pendingCount,
      dispensedToday,
      stockoutCount,
      totalToday
    ] = await Promise.all([
      prisma.prescription.count({ where: { status: 'Pending' } }),
      prisma.prescription.count({
        where: {
          status: 'Dispensed',
          updated_at: { gte: today }
        }
      }),
      prisma.prescription.count({ where: { status: 'Stockout' } }),
      prisma.prescription.count({
        where: { created_at: { gte: today } }
      })
    ]);

    res.json({
      pendingCount,
      dispensedToday,
      stockoutCount,
      totalToday
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch pharmacy stats' });
  }
};

// Get prescriptions by patient
const getPatientPrescriptions = async (req, res) => {
  const { patientId } = req.params;

  try {
    const prescriptions = await prisma.prescription.findMany({
      where: { patient_id: parseInt(patientId) },
      include: {
        visit: {
          select: {
            visit_date: true,
            diagnosis: true
          }
        }
      },
      orderBy: { created_at: 'desc' }
    });
    res.json(prescriptions);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch patient prescriptions' });
  }
};

/**
 * Search medicines using vector similarity (includes inventory info)
 * POST /api/pharmacy/search-medicines
 */
const searchMedicines = async (req, res) => {
  const { query, limit = 10 } = req.body;
  
  try {
    const results = await vectorSearchService.searchMedicines(query, { limit });
    
    // Enrich with inventory information
    const medicineIds = results.map(r => r.id);
    if (medicineIds.length > 0) {
      const medicines = await prisma.medicine.findMany({
        where: { id: { in: medicineIds } },
        select: {
          id: true,
          quantity: true,
          reorder_level: true,
          unit: true
        }
      });
      
      const medicineMap = new Map(medicines.map(m => [m.id, m]));
      
      const enrichedResults = results.map(result => {
        const medicine = medicineMap.get(result.id);
        return {
          ...result,
          quantity: medicine?.quantity ?? 0,
          reorderLevel: medicine?.reorder_level ?? 10,
          unit: medicine?.unit ?? 'units',
          isLowStock: medicine ? medicine.quantity <= medicine.reorder_level : false,
          isOutOfStock: medicine ? medicine.quantity === 0 : false
        };
      });
      
      return res.json(enrichedResults);
    }
    
    res.json(results);
  } catch (error) {
    console.error('Medicine search error:', error);
    res.status(500).json({ error: 'Failed to search medicines' });
  }
};

/**
 * Get medicine details by ID
 * GET /api/pharmacy/medicines/:id
 */
const getMedicineById = async (req, res) => {
  const { id } = req.params;
  
  try {
    const medicine = await vectorSearchService.getMedicineById(id);
    if (!medicine) {
      return res.status(404).json({ error: 'Medicine not found' });
    }
    res.json(medicine);
  } catch (error) {
    console.error('Get medicine error:', error);
    res.status(500).json({ error: 'Failed to fetch medicine' });
  }
};

/**
 * Autocomplete medicines by name (fast, no vector search) - includes inventory
 * GET /api/pharmacy/medicines/autocomplete?query=par
 */
const autocompleteMedicines = async (req, res) => {
  const { query } = req.query;
  
  if (!query || query.trim().length < 2) {
    return res.json([]);
  }
  
  const searchQuery = query.trim();
  
  try {
    // Fast name-based search with fuzzy matching - includes inventory fields
    const results = await prisma.$queryRaw`
      SELECT 
        id,
        name,
        generic_name,
        ndc_code,
        manufacturer,
        quantity,
        reorder_level,
        unit,
        CASE 
          WHEN LOWER(name) = LOWER(${searchQuery}) THEN 1.0
          WHEN LOWER(name) LIKE LOWER(${searchQuery + '%'}) THEN 0.95
          WHEN LOWER(name) LIKE LOWER(${'%' + searchQuery + '%'}) THEN 0.85
          WHEN LOWER(generic_name) LIKE LOWER(${'%' + searchQuery + '%'}) THEN 0.80
          ELSE similarity(LOWER(name), LOWER(${searchQuery}))
        END as match_score
      FROM medicines
      WHERE 
        LOWER(name) LIKE LOWER(${'%' + searchQuery + '%'})
        OR LOWER(generic_name) LIKE LOWER(${'%' + searchQuery + '%'})
        OR LOWER(ndc_code) LIKE LOWER(${'%' + searchQuery + '%'})
        OR similarity(LOWER(name), LOWER(${searchQuery})) > 0.25
      ORDER BY 
        CASE 
          WHEN LOWER(name) = LOWER(${searchQuery}) THEN 1
          WHEN LOWER(name) LIKE LOWER(${searchQuery + '%'}) THEN 2
          WHEN LOWER(name) LIKE LOWER(${'%' + searchQuery + '%'}) THEN 3
          WHEN LOWER(generic_name) LIKE LOWER(${'%' + searchQuery + '%'}) THEN 4
          ELSE 5
        END,
        match_score DESC,
        name ASC
      LIMIT 50
    `;
    
    // Deduplicate medicines by name, keeping only clinically different ones
    const medicineMap = new Map();
    const normalizedResults = results.map(r => ({
      id: r.id,
      name: r.name?.trim() || '',
      genericName: r.generic_name?.trim() || null,
      ndcCode: r.ndc_code?.trim() || null,
      manufacturer: r.manufacturer?.trim() || null,
      matchScore: Number(r.match_score),
      quantity: r.quantity ?? 0,
      reorderLevel: r.reorder_level ?? 10,
      unit: r.unit || 'units',
      isLowStock: (r.quantity ?? 0) <= (r.reorder_level ?? 10),
      isOutOfStock: (r.quantity ?? 0) === 0
    }));
    
    // Helper function to check if generic name is meaningfully different
    const isGenericNameDifferent = (name1, name2) => {
      if (!name1 || !name2) return false;
      const n1 = name1.toLowerCase().trim();
      const n2 = name2.toLowerCase().trim();
      // If generic name is same as brand name, it's not meaningfully different
      return n1 !== n2 && n1.length > 0 && n2.length > 0;
    };
    
    // Helper function to extract strength/form from name
    const extractStrengthForm = (name) => {
      const match = name.match(/(\d+\s*(mg|g|ml|mcg|%|units?))|(tablet|capsule|syrup|injection|cream|ointment|drops?|inhaler|spray)/i);
      return match ? match[0].toLowerCase() : null;
    };
    
    for (const medicine of normalizedResults) {
      const nameKey = medicine.name.toLowerCase();
      const medicineStrengthForm = extractStrengthForm(medicine.name);
      
      // Check if we already have this exact name
      if (!medicineMap.has(nameKey)) {
        // First occurrence of this name
        medicineMap.set(nameKey, medicine);
      } else {
        const existing = medicineMap.get(nameKey);
        const existingStrengthForm = extractStrengthForm(existing.name);
        
        // Check if this medicine is clinically different (not just different manufacturer)
        const isClinicallyDifferent = 
          // Different generic names (and generic name is different from brand name)
          isGenericNameDifferent(medicine.genericName, existing.genericName) ||
          // Different strength/form in the name itself
          (medicineStrengthForm && existingStrengthForm && 
           medicineStrengthForm !== existingStrengthForm) ||
          // One has generic name that's different from brand, other doesn't
          (medicine.genericName && medicine.genericName.toLowerCase() !== nameKey && 
           (!existing.genericName || existing.genericName.toLowerCase() === nameKey)) ||
          (existing.genericName && existing.genericName.toLowerCase() !== nameKey && 
           (!medicine.genericName || medicine.genericName.toLowerCase() === nameKey));
        
        if (isClinicallyDifferent) {
          // Keep both if clinically different
          if (Array.isArray(existing)) {
            existing.push(medicine);
          } else {
            medicineMap.set(nameKey, [existing, medicine]);
          }
        } else {
          // Same medicine, different manufacturer/NDC - keep only the best one
          // Prefer higher match score
          if (medicine.matchScore > existing.matchScore) {
            medicineMap.set(nameKey, medicine);
          } else if (medicine.matchScore === existing.matchScore) {
            // If match scores equal, prefer the one with more complete information
            const existingInfo = [existing.genericName, existing.manufacturer, existing.ndcCode].filter(Boolean).length;
            const medicineInfo = [medicine.genericName, medicine.manufacturer, medicine.ndcCode].filter(Boolean).length;
            if (medicineInfo > existingInfo) {
              medicineMap.set(nameKey, medicine);
            } else if (medicineInfo === existingInfo) {
              // If still equal, prefer the one with generic name (if it's different from brand)
              if (medicine.genericName && medicine.genericName.toLowerCase() !== nameKey && 
                  (!existing.genericName || existing.genericName.toLowerCase() === nameKey)) {
                medicineMap.set(nameKey, medicine);
              }
            }
          }
        }
      }
    }
    
    // Flatten the results (handle arrays of clinically different medicines)
    const deduplicatedResults = [];
    for (const value of medicineMap.values()) {
      if (Array.isArray(value)) {
        // Sort by match score and add all clinically different versions
        value.sort((a, b) => b.matchScore - a.matchScore);
        deduplicatedResults.push(...value);
      } else {
        deduplicatedResults.push(value);
      }
    }
    
    // Sort final results by match score and limit to 20
    deduplicatedResults.sort((a, b) => b.matchScore - a.matchScore);
    
    res.json(deduplicatedResults.slice(0, 20));
  } catch (error) {
    console.error('Medicine autocomplete error:', error);
    res.status(500).json({ error: 'Failed to autocomplete medicines' });
  }
};

// ============== INVENTORY MANAGEMENT ==============

/**
 * Get all medicines with inventory
 * GET /api/pharmacy/inventory
 */
const getAllMedicines = async (req, res) => {
  const { search, lowStock, outOfStock, page = 1, limit = 50 } = req.query;
  
  try {
    const where = {};
    
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { generic_name: { contains: search, mode: 'insensitive' } },
        { ndc_code: { contains: search, mode: 'insensitive' } }
      ];
    }
    
    if (outOfStock === 'true') {
      where.quantity = 0;
    }
    
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    // Fetch all medicines first, then filter for low stock in memory
    // (Prisma doesn't support comparing two columns directly in where clause)
    const [allMedicines, total] = await Promise.all([
      prisma.medicine.findMany({
        where: outOfStock === 'true' ? { ...where, quantity: 0 } : where,
        select: {
          id: true,
          name: true,
          generic_name: true,
          ndc_code: true,
          manufacturer: true,
          quantity: true,
          reorder_level: true,
          unit: true,
          last_restocked: true,
          updated_at: true
        },
        orderBy: [
          { quantity: 'asc' }, // Low stock first
          { name: 'asc' }
        ],
        skip,
        take: parseInt(limit)
      }),
      prisma.medicine.count({ where: outOfStock === 'true' ? { ...where, quantity: 0 } : where })
    ]);
    
    // Filter for low stock in memory if requested
    let medicines = allMedicines;
    if (lowStock === 'true') {
      medicines = allMedicines.filter(m => m.quantity <= m.reorder_level && m.quantity > 0);
    }
    
    const enrichedMedicines = medicines.map(m => ({
      ...m,
      isLowStock: m.quantity <= m.reorder_level && m.quantity > 0,
      isOutOfStock: m.quantity === 0
    }));
    
    res.json({
      medicines: enrichedMedicines,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: lowStock === 'true' ? medicines.length : total,
        totalPages: Math.ceil((lowStock === 'true' ? medicines.length : total) / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Get medicines error:', error);
    res.status(500).json({ error: 'Failed to fetch medicines' });
  }
};

/**
 * Update medicine inventory (restock)
 * PATCH /api/pharmacy/inventory/:id
 */
const updateInventory = async (req, res) => {
  const { id } = req.params;
  const { quantity, reorder_level, unit } = req.body;
  
  try {
    const medicine = await prisma.medicine.findUnique({
      where: { id: parseInt(id) }
    });
    
    if (!medicine) {
      return res.status(404).json({ error: 'Medicine not found' });
    }
    
    const updateData = {
      last_restocked: new Date(),
      last_restocked_by: req.user.userId
    };
    
    if (quantity !== undefined) {
      updateData.quantity = parseInt(quantity);
    }
    
    if (reorder_level !== undefined) {
      updateData.reorder_level = parseInt(reorder_level);
    }
    
    if (unit !== undefined) {
      updateData.unit = unit;
    }
    
    const updated = await prisma.medicine.update({
      where: { id: parseInt(id) },
      data: updateData
    });
    
    // Log the restock action
    await logAction({
      userId: req.user.userId,
      action: 'RESTOCK_MEDICINE',
      entity: 'Medicine',
      entityId: updated.id,
      afterSnapshot: {
        name: updated.name,
        quantity: updated.quantity,
        reorder_level: updated.reorder_level,
        unit: updated.unit
      }
    });
    
    res.json({ message: 'Inventory updated', medicine: updated });
  } catch (error) {
    console.error('Update inventory error:', error);
    res.status(500).json({ error: 'Failed to update inventory' });
  }
};

/**
 * Bulk update inventory (for initial seeding)
 * POST /api/pharmacy/inventory/bulk
 */
const bulkUpdateInventory = async (req, res) => {
  const { updates } = req.body; // Array of { id, quantity, reorder_level, unit }
  
  if (!Array.isArray(updates) || updates.length === 0) {
    return res.status(400).json({ error: 'Updates array is required' });
  }
  
  try {
    const results = await prisma.$transaction(
      updates.map(update => 
        prisma.medicine.update({
          where: { id: parseInt(update.id) },
          data: {
            quantity: parseInt(update.quantity) || 0,
            reorder_level: parseInt(update.reorder_level) || 10,
            unit: update.unit || 'units',
            last_restocked: new Date(),
            last_restocked_by: req.user.userId
          }
        })
      )
    );
    
    // Log bulk action
    await logAction({
      userId: req.user.userId,
      action: 'BULK_RESTOCK_MEDICINES',
      entity: 'Medicine',
      afterSnapshot: {
        count: results.length,
        medicines: results.map(r => ({ id: r.id, name: r.name, quantity: r.quantity }))
      }
    });
    
    res.json({ 
      message: `Updated ${results.length} medicines`, 
      count: results.length 
    });
  } catch (error) {
    console.error('Bulk update error:', error);
    res.status(500).json({ error: 'Failed to bulk update inventory' });
  }
};

/**
 * Get inventory stats
 * GET /api/pharmacy/inventory/stats
 */
const getInventoryStats = async (req, res) => {
  try {
    const [
      totalMedicines,
      outOfStock,
      lowStock,
      totalQuantity
    ] = await Promise.all([
      prisma.medicine.count(),
      prisma.medicine.count({ where: { quantity: 0 } }),
      prisma.$queryRaw`
        SELECT COUNT(*)::int as count
        FROM medicines
        WHERE quantity <= reorder_level AND quantity > 0
      `,
      prisma.medicine.aggregate({
        _sum: { quantity: true }
      })
    ]);
    
    const lowStockCount = Array.isArray(lowStock) ? (lowStock[0]?.count || 0) : 0;
    
    res.json({
      totalMedicines,
      outOfStock,
      lowStock: lowStockCount,
      inStock: totalMedicines - outOfStock,
      totalQuantity: totalQuantity._sum.quantity || 0
    });
  } catch (error) {
    console.error('Get inventory stats error:', error);
    res.status(500).json({ error: 'Failed to fetch inventory stats' });
  }
};

module.exports = {
  getPendingPrescriptions,
  getAllPrescriptions,
  dispensePrescription,
  markStockout,
  cancelPrescription,
  getPharmacyStats,
  getPatientPrescriptions,
  searchMedicines,
  autocompleteMedicines,
  getMedicineById,
  // Inventory management
  getAllMedicines,
  updateInventory,
  bulkUpdateInventory,
  getInventoryStats
};
