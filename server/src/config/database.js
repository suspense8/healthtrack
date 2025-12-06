const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient({
  log: ['warn', 'error'],
  errorFormat: 'pretty',
});

// Handle Prisma client connection errors
prisma.$connect()
  .then(() => {
    console.log('✓ Database connected successfully');
  })
  .catch((err) => {
    console.error('✗ Database connection failed:', err.message);
    process.exit(1);
  });

// Handle graceful shutdown
process.on('SIGINT', async () => {
  await prisma.$disconnect();
  process.exit(0);
});

module.exports = prisma;
