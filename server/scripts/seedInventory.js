/**
 * Seed Initial Inventory Values
 * 
 * This script allows pharmacists to set initial inventory quantities for all medicines.
 * Run this after the inventory migration has been applied.
 * 
 * Usage:
 *   node scripts/seedInventory.js [options]
 * 
 * Options:
 *   --default-quantity=N    Set default quantity for all medicines (default: 100)
 *   --default-reorder=N     Set default reorder level (default: 10)
 *   --unit=UNIT             Set default unit (default: 'units')
 *   --low-stock-only        Only update medicines with quantity <= reorder_level
 *   --zero-only             Only update medicines with quantity = 0
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Parse command line arguments
const args = process.argv.slice(2);
const options = {
  defaultQuantity: 100,
  defaultReorder: 10,
  unit: 'units',
  lowStockOnly: false,
  zeroOnly: false
};

args.forEach(arg => {
  if (arg.startsWith('--default-quantity=')) {
    options.defaultQuantity = parseInt(arg.split('=')[1]);
  } else if (arg.startsWith('--default-reorder=')) {
    options.defaultReorder = parseInt(arg.split('=')[1]);
  } else if (arg.startsWith('--unit=')) {
    options.unit = arg.split('=')[1];
  } else if (arg === '--low-stock-only') {
    options.lowStockOnly = true;
  } else if (arg === '--zero-only') {
    options.zeroOnly = true;
  }
});

async function seedInventory() {
  try {
    console.log('🌱 Starting inventory seeding...');
    console.log(`   Default Quantity: ${options.defaultQuantity}`);
    console.log(`   Default Reorder Level: ${options.defaultReorder}`);
    console.log(`   Default Unit: ${options.unit}`);
    console.log(`   Low Stock Only: ${options.lowStockOnly}`);
    console.log(`   Zero Only: ${options.zeroOnly}`);
    console.log('');

    // Build where clause
    const where = {};
    if (options.zeroOnly) {
      where.quantity = 0;
    }
    // Note: lowStockOnly filtering will be done in memory since Prisma
    // doesn't support comparing two columns directly in where clause

    // Get medicines to update
    let medicines = await prisma.medicine.findMany({
      where,
      select: {
        id: true,
        name: true,
        quantity: true,
        reorder_level: true,
        unit: true
      }
    });

    // Filter for low stock in memory if requested
    if (options.lowStockOnly) {
      medicines = medicines.filter(m => m.quantity <= m.reorder_level && m.quantity > 0);
    }

    console.log(`📦 Found ${medicines.length} medicines to update`);

    if (medicines.length === 0) {
      console.log('✅ No medicines to update. Exiting.');
      return;
    }

    // Update medicines
    let updated = 0;
    for (const medicine of medicines) {
      const updateData = {
        quantity: options.defaultQuantity,
        reorder_level: options.defaultReorder,
        unit: options.unit,
        last_restocked: new Date()
      };

      await prisma.medicine.update({
        where: { id: medicine.id },
        data: updateData
      });

      updated++;
      
      if (updated % 100 === 0) {
        console.log(`   Updated ${updated}/${medicines.length} medicines...`);
      }
    }

    console.log('');
    console.log(`✅ Successfully updated ${updated} medicines`);
    console.log('');

    // Show summary
    const stats = await prisma.medicine.aggregate({
      _count: { id: true },
      _sum: { quantity: true },
      _avg: { quantity: true }
    });

    // Count low stock medicines (quantity <= reorder_level but > 0)
    // We need to fetch and filter in memory since Prisma doesn't support column comparison
    const allMedicinesForStats = await prisma.medicine.findMany({
      select: { quantity: true, reorder_level: true }
    });
    const lowStock = allMedicinesForStats.filter(m => m.quantity <= m.reorder_level && m.quantity > 0).length;

    const outOfStock = await prisma.medicine.count({
      where: { quantity: 0 }
    });

    console.log('📊 Inventory Summary:');
    console.log(`   Total Medicines: ${stats._count.id}`);
    console.log(`   Total Quantity: ${stats._sum.quantity}`);
    console.log(`   Average Quantity: ${Math.round(stats._avg.quantity || 0)}`);
    console.log(`   Low Stock: ${lowStock}`);
    console.log(`   Out of Stock: ${outOfStock}`);
    console.log(`   In Stock: ${stats._count.id - outOfStock}`);

  } catch (error) {
    console.error('❌ Error seeding inventory:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the seed
seedInventory();
