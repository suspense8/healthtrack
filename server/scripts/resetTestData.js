/**
 * Reset Test Data Script
 * 
 * This script resets all non-essential tables for testing purposes.
 * It preserves:
 *   - User accounts (authentication/authorization)
 *   - Wards & Beds (seeded infrastructure data)
 *   - Diseases (seeded medical reference data)
 *   - Medicines (seeded pharmaceutical data)
 * 
 * It clears:
 *   - All patient records and related medical data
 *   - Appointments
 *   - Attendance logs (visits)
 *   - Lab orders
 *   - Prescriptions
 *   - Admissions and admission notes
 *   - Obstetric visits, deliveries, and partograph entries
 *   - Tasks
 *   - Reception audit logs
 * 
 * Usage: node scripts/resetTestData.js
 */

const { PrismaClient } = require('@prisma/client');
const readline = require('readline');

const prisma = new PrismaClient();

// ANSI color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function confirmReset() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise((resolve) => {
    rl.question(
      `${colors.yellow}${colors.bold}⚠️  WARNING: This will delete ALL test data!${colors.reset}\n\n` +
      `${colors.cyan}Preserved (will NOT be deleted):${colors.reset}\n` +
      `  ✓ Users (authentication)\n` +
      `  ✓ Wards & Beds (seeded data)\n` +
      `  ✓ Diseases (seeded data)\n` +
      `  ✓ Medicines (seeded data)\n\n` +
      `${colors.red}To be deleted:${colors.reset}\n` +
      `  ✗ Patients\n` +
      `  ✗ Appointments\n` +
      `  ✗ AttendanceLogs (visits)\n` +
      `  ✗ LabOrders\n` +
      `  ✗ Prescriptions\n` +
      `  ✗ Admissions & AdmissionNotes\n` +
      `  ✗ ObstetricVisits, Deliveries, PartographEntries\n` +
      `  ✗ Tasks\n` +
      `  ✗ ReceptionAudit\n\n` +
      `${colors.yellow}Are you sure you want to continue? (yes/no): ${colors.reset}`,
      (answer) => {
        rl.close();
        resolve(answer.toLowerCase() === 'yes' || answer.toLowerCase() === 'y');
      }
    );
  });
}

async function getTableCounts() {
  log('\n📊 Current database state:', 'cyan');
  
  const counts = {
    // Essential (preserved)
    users: await prisma.user.count(),
    wards: await prisma.ward.count(),
    beds: await prisma.bed.count(),
    diseases: await prisma.disease.count(),
    medicines: await prisma.medicine.count(),
    
    // Non-essential (to be deleted)
    patients: await prisma.patient.count(),
    appointments: await prisma.appointment.count(),
    attendanceLogs: await prisma.attendanceLog.count(),
    labOrders: await prisma.labOrder.count(),
    prescriptions: await prisma.prescription.count(),
    admissions: await prisma.admission.count(),
    admissionNotes: await prisma.admissionNote.count(),
    obstetricVisits: await prisma.obstetricVisit.count(),
    deliveries: await prisma.delivery.count(),
    partographEntries: await prisma.partographEntry.count(),
    tasks: await prisma.task.count(),
    receptionAudits: await prisma.receptionAudit.count()
  };
  
  log('\nEssential Data (PRESERVED):', 'green');
  log(`  Users: ${counts.users}`);
  log(`  Wards: ${counts.wards}`);
  log(`  Beds: ${counts.beds}`);
  log(`  Diseases: ${counts.diseases}`);
  log(`  Medicines: ${counts.medicines}`);
  
  log('\nTest Data (TO BE DELETED):', 'red');
  log(`  Patients: ${counts.patients}`);
  log(`  Appointments: ${counts.appointments}`);
  log(`  Attendance Logs: ${counts.attendanceLogs}`);
  log(`  Lab Orders: ${counts.labOrders}`);
  log(`  Prescriptions: ${counts.prescriptions}`);
  log(`  Admissions: ${counts.admissions}`);
  log(`  Admission Notes: ${counts.admissionNotes}`);
  log(`  Obstetric Visits: ${counts.obstetricVisits}`);
  log(`  Deliveries: ${counts.deliveries}`);
  log(`  Partograph Entries: ${counts.partographEntries}`);
  log(`  Tasks: ${counts.tasks}`);
  log(`  Reception Audits: ${counts.receptionAudits}`);
  
  return counts;
}

async function resetTestData() {
  try {
    log('\n🔄 Starting test data reset process...\n', 'bold');
    
    // Show current state
    await getTableCounts();
    
    // Confirm with user
    const confirmed = await confirmReset();
    
    if (!confirmed) {
      log('\n❌ Reset cancelled by user.', 'yellow');
      return;
    }
    
    log('\n🗑️  Deleting test data...', 'blue');
    
    // Delete in correct order to respect foreign key constraints
    // Start with child tables first, then parent tables
    
    log('  → Deleting PartographEntries...', 'cyan');
    await prisma.partographEntry.deleteMany({});
    
    log('  → Deleting Deliveries...', 'cyan');
    await prisma.delivery.deleteMany({});
    
    log('  → Deleting ObstetricVisits...', 'cyan');
    await prisma.obstetricVisit.deleteMany({});
    
    log('  → Deleting Tasks...', 'cyan');
    await prisma.task.deleteMany({});
    
    log('  → Deleting AdmissionNotes...', 'cyan');
    await prisma.admissionNote.deleteMany({});
    
    log('  → Deleting Admissions...', 'cyan');
    await prisma.admission.deleteMany({});
    
    // Reset bed statuses after deleting admissions
    log('  → Resetting bed statuses to Available...', 'cyan');
    await prisma.bed.updateMany({
      data: {
        status: 'Available',
        notes: null
      }
    });
    
    log('  → Deleting LabOrders...', 'cyan');
    await prisma.labOrder.deleteMany({});
    
    log('  → Deleting Prescriptions...', 'cyan');
    await prisma.prescription.deleteMany({});
    
    log('  → Deleting AttendanceLogs (visits)...', 'cyan');
    await prisma.attendanceLog.deleteMany({});
    
    log('  → Deleting Appointments...', 'cyan');
    await prisma.appointment.deleteMany({});
    
    log('  → Deleting Patients...', 'cyan');
    await prisma.patient.deleteMany({});
    
    log('  → Deleting ReceptionAudits...', 'cyan');
    await prisma.receptionAudit.deleteMany({});
    
    // Reset auto-increment sequences for deleted tables
    log('\n🔢 Resetting ID sequences...', 'blue');
    await prisma.$executeRaw`ALTER SEQUENCE IF EXISTS "Patient_patient_id_seq" RESTART WITH 1`;
    await prisma.$executeRaw`ALTER SEQUENCE IF EXISTS "Appointment_appointment_id_seq" RESTART WITH 1`;
    await prisma.$executeRaw`ALTER SEQUENCE IF EXISTS "AttendanceLog_visit_id_seq" RESTART WITH 1`;
    await prisma.$executeRaw`ALTER SEQUENCE IF EXISTS "LabOrder_order_id_seq" RESTART WITH 1`;
    await prisma.$executeRaw`ALTER SEQUENCE IF EXISTS "Prescription_prescription_id_seq" RESTART WITH 1`;
    await prisma.$executeRaw`ALTER SEQUENCE IF EXISTS "Admission_admission_id_seq" RESTART WITH 1`;
    await prisma.$executeRaw`ALTER SEQUENCE IF EXISTS "AdmissionNote_note_id_seq" RESTART WITH 1`;
    await prisma.$executeRaw`ALTER SEQUENCE IF EXISTS "ObstetricVisit_obstetric_visit_id_seq" RESTART WITH 1`;
    await prisma.$executeRaw`ALTER SEQUENCE IF EXISTS "Delivery_delivery_id_seq" RESTART WITH 1`;
    await prisma.$executeRaw`ALTER SEQUENCE IF EXISTS "PartographEntry_entry_id_seq" RESTART WITH 1`;
    await prisma.$executeRaw`ALTER SEQUENCE IF EXISTS "Task_task_id_seq" RESTART WITH 1`;
    await prisma.$executeRaw`ALTER SEQUENCE IF EXISTS "ReceptionAudit_audit_id_seq" RESTART WITH 1`;
    
    log('\n✅ Test data reset complete!\n', 'green');
    
    // Show final state
    log('📊 Final database state:', 'cyan');
    const finalCounts = await getTableCounts();
    
    // Verify essential data is preserved
    log('\n✓ Verification:', 'green');
    if (finalCounts.users > 0) log('  ✓ Users preserved', 'green');
    if (finalCounts.wards > 0) log('  ✓ Wards preserved', 'green');
    if (finalCounts.beds > 0) log('  ✓ Beds preserved', 'green');
    if (finalCounts.diseases > 0) log('  ✓ Diseases preserved', 'green');
    if (finalCounts.medicines > 0) log('  ✓ Medicines preserved', 'green');
    
    // Verify test data is cleared
    const testDataCleared = 
      finalCounts.patients === 0 &&
      finalCounts.appointments === 0 &&
      finalCounts.attendanceLogs === 0 &&
      finalCounts.labOrders === 0 &&
      finalCounts.prescriptions === 0;
    
    if (testDataCleared) {
      log('  ✓ All test data cleared', 'green');
    } else {
      log('  ⚠️  Some test data may remain', 'yellow');
    }
    
  } catch (error) {
    log('\n❌ Reset failed:', 'red');
    console.error(error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run if called directly
if (require.main === module) {
  resetTestData()
    .then(() => {
      log('\n✨ Done!\n', 'green');
      process.exit(0);
    })
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}

module.exports = { resetTestData };
