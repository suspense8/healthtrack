/**
 * Clear Medicines from Database
 * 
 * Removes all medicines from the database and resets the sequence.
 * Preserves prescriptions but sets medicine_id to NULL.
 * 
 * Usage: node scripts/clearMedicines.js
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function clearMedicines() {
  try {
    console.log('🗑️  Starting medicine clearing process...\n');
    
    // Count existing medicines
    const count = await prisma.medicine.count();
    console.log(`   Found ${count} medicines in database.\n`);
    
    if (count === 0) {
      console.log('✅ Database is already empty. Nothing to clear.\n');
      return;
    }
    
    // Check for prescriptions linked to medicines
    const linkedPrescriptions = await prisma.prescription.count({
      where: {
        medicine_id: { not: null }
      }
    });
    
    if (linkedPrescriptions > 0) {
      console.log(`⚠️  Warning: ${linkedPrescriptions} prescriptions are linked to medicines.`);
      console.log('   These will have their medicine_id set to NULL (prescriptions preserved).\n');
    }
    
    // Delete all medicines
    console.log('Deleting medicines...');
    await prisma.$executeRaw`DELETE FROM medicines`;
    console.log('✅ All medicines deleted.\n');
    
    // Reset sequence
    console.log('Resetting sequence...');
    await prisma.$executeRaw`ALTER SEQUENCE medicines_id_seq RESTART WITH 1`;
    console.log('✅ Sequence reset.\n');
    
    // Verify
    const finalCount = await prisma.medicine.count();
    console.log(`✅ Clearing complete! Remaining medicines: ${finalCount}\n`);
    
  } catch (error) {
    console.error('❌ Error clearing medicines:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run if called directly
if (require.main === module) {
  clearMedicines()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}

module.exports = { clearMedicines };
