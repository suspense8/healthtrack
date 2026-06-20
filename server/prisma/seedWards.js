const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function seedWardsAndBeds() {
  console.log('Seeding wards and beds...');

  const wards = [
    { ward_name: 'Male Ward', ward_type: 'General', total_beds: 10, description: 'General male patients' },
    { ward_name: 'Female Ward', ward_type: 'General', total_beds: 10, description: 'General female patients' },
    { ward_name: 'Children Ward', ward_type: 'Pediatric', total_beds: 8, description: 'Pediatric patients' },
    { ward_name: 'Antenatal Ward', ward_type: 'Maternity', total_beds: 6, description: 'Pregnant women before delivery' },
    { ward_name: 'Labor/Delivery Suite', ward_type: 'Maternity', total_beds: 4, description: 'Active labor and delivery' },
    { ward_name: 'Postnatal Ward', ward_type: 'Maternity', total_beds: 6, description: 'Mothers after delivery' },
    { ward_name: 'Emergency Ward', ward_type: 'Emergency', total_beds: 4, description: 'Critical and emergency cases' },
  ];

  for (const wardData of wards) {
    const ward = await prisma.ward.upsert({
      where: { ward_name: wardData.ward_name },
      update: wardData,
      create: wardData,
    });

    console.log(`Created/Updated ward: ${ward.ward_name}`);

    // Create beds for this ward
    for (let i = 1; i <= wardData.total_beds; i++) {
      const bedNumber = `${ward.ward_name.charAt(0)}${i}`; // e.g., M1, M2 for Male Ward
      await prisma.bed.upsert({
        where: { 
          ward_id_bed_number: { 
            ward_id: ward.ward_id, 
            bed_number: bedNumber 
          } 
        },
        update: { status: 'Available' },
        create: {
          ward_id: ward.ward_id,
          bed_number: bedNumber,
          status: 'Available',
        },
      });
    }
    console.log(`  Created ${wardData.total_beds} beds`);
  }

  console.log('Seeding complete!');
}

seedWardsAndBeds()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
