/**
 * Ward & Bed Seeding Script
 * 
 * Seeds initial ward and bed data for the hospital.
 * 
 * Usage: node scripts/seedWards.js
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const WARDS = [
  {
    ward_name: 'General Ward',
    ward_type: 'General',
    total_beds: 20,
    description: 'General medical ward for adult patients requiring observation and treatment',
    beds: ['G1', 'G2', 'G3', 'G4', 'G5', 'G6', 'G7', 'G8', 'G9', 'G10', 'G11', 'G12', 'G13', 'G14', 'G15', 'G16', 'G17', 'G18', 'G19', 'G20']
  },
  {
    ward_name: 'Maternity Ward',
    ward_type: 'Maternity',
    total_beds: 15,
    description: 'Maternity ward for prenatal, delivery, and postnatal care',
    beds: ['M1', 'M2', 'M3', 'M4', 'M5', 'M6', 'M7', 'M8', 'M9', 'M10', 'M11', 'M12', 'M13', 'M14', 'M15']
  },
  {
    ward_name: 'Pediatric Ward',
    ward_type: 'Pediatric',
    total_beds: 12,
    description: 'Ward for children and infants requiring medical care',
    beds: ['P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'P7', 'P8', 'P9', 'P10', 'P11', 'P12']
  },
  {
    ward_name: 'Emergency Ward',
    ward_type: 'Emergency',
    total_beds: 8,
    description: 'Emergency observation and stabilization beds',
    beds: ['E1', 'E2', 'E3', 'E4', 'E5', 'E6', 'E7', 'E8']
  },
  {
    ward_name: 'Surgical Ward',
    ward_type: 'Surgical',
    total_beds: 10,
    description: 'Post-operative care and surgical recovery ward',
    beds: ['S1', 'S2', 'S3', 'S4', 'S5', 'S6', 'S7', 'S8', 'S9', 'S10']
  },
  {
    ward_name: 'ICU',
    ward_type: 'ICU',
    total_beds: 6,
    description: 'Intensive Care Unit for critical patients',
    beds: ['ICU1', 'ICU2', 'ICU3', 'ICU4', 'ICU5', 'ICU6']
  }
];

async function seedWards() {
  console.log('Starting ward seeding...\n');

  try {
    // Clear existing data
    console.log('Clearing existing beds and wards...');
    await prisma.bed.deleteMany({});
    await prisma.ward.deleteMany({});
    console.log('Done.\n');

    let totalWards = 0;
    let totalBeds = 0;

    for (const wardData of WARDS) {
      const { beds, ...wardInfo } = wardData;

      // Create ward
      const ward = await prisma.ward.create({
        data: wardInfo
      });
      totalWards++;
      console.log(`Created ward: ${ward.ward_name}`);

      // Create beds for this ward
      for (const bedNumber of beds) {
        await prisma.bed.create({
          data: {
            ward_id: ward.ward_id,
            bed_number: bedNumber,
            status: 'Available'
          }
        });
        totalBeds++;
      }
      console.log(`  → Added ${beds.length} beds`);
    }

    console.log(`\n✅ Seeding complete! Created ${totalWards} wards with ${totalBeds} beds total.`);

  } catch (error) {
    console.error('Seeding failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

/**
 * Idempotent version — skips seeding if wards already exist.
 * Safe to call on every startup.
 */
async function seedWardsIfEmpty() {
  try {
    const wardCount = await prisma.ward.count();
    if (wardCount > 0) {
      console.log(`Wards already seeded (${wardCount} wards found), skipping.`);
      return;
    }

    console.log('No wards found. Seeding initial wards and beds...');

    let totalWards = 0;
    let totalBeds = 0;

    for (const wardData of WARDS) {
      const { beds, ...wardInfo } = wardData;

      const ward = await prisma.ward.create({
        data: wardInfo
      });
      totalWards++;

      for (const bedNumber of beds) {
        await prisma.bed.create({
          data: {
            ward_id: ward.ward_id,
            bed_number: bedNumber,
            status: 'Available'
          }
        });
        totalBeds++;
      }
    }

    console.log(`✅ Ward seeding complete! Created ${totalWards} wards with ${totalBeds} beds.`);
  } catch (error) {
    console.error('Ward seeding failed:', error.message);
    // Don't throw — allow server to start even if ward seeding fails
  }
}

// Run if called directly
if (require.main === module) {
  seedWards()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}

module.exports = { seedWards, seedWardsIfEmpty };
