const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Seeding wards and beds...');

  const wards = [
    { name: 'General Ward - Male', capacity: 20, type: 'General' },
    { name: 'General Ward - Female', capacity: 20, type: 'General' },
    { name: 'Pediatric Ward', capacity: 15, type: 'Pediatric' },
    { name: 'Maternity Ward', capacity: 10, type: 'Maternity' },
    { name: 'ICU', capacity: 5, type: 'ICU' },
    { name: 'Private Ward', capacity: 8, type: 'Private' },
  ];

  for (const wardData of wards) {
    const ward = await prisma.ward.create({
      data: {
        name: wardData.name,
        capacity: wardData.capacity,
        type: wardData.type,
      },
    });

    console.log(`Created ward: ${ward.name}`);

    // Create beds for the ward
    const bedPromises = [];
    for (let i = 1; i <= wardData.capacity; i++) {
      bedPromises.push(
        prisma.bed.create({
          data: {
            ward_id: ward.ward_id,
            bed_number: `${ward.type.substring(0, 3).toUpperCase()}-${i.toString().padStart(2, '0')}`,
            status: 'Available',
          },
        })
      );
    }

    await Promise.all(bedPromises);
    console.log(`  - Added ${wardData.capacity} beds`);
  }

  console.log('Seeding completed.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
