const { PrismaClient } = require("@prisma/client");
const { execSync } = require("child_process");
const path = require("path");
const bcrypt = require("bcryptjs");

// Lazy-required so they don't load heavy dependencies until needed
function getSeedWards() { return require('../../scripts/seedWards'); }
function getSeedDiseases() { return require('../../scripts/seedDiseases'); }
function getSeedMedicines() { return require('../../scripts/seedMedicines'); }

const prisma = new PrismaClient({
  log: ['warn', 'error'],
  errorFormat: 'pretty',
});

/**
 * Seed a default admin user if no admin exists.
 */
async function seedAdminUser() {
  try {
    const adminCount = await prisma.user.count({
      where: { role: 'admin' }
    });

    if (adminCount === 0) {
      console.log('No admin user found. Creating default admin...');

      const hashedPassword = await bcrypt.hash('admin123', 10);

      await prisma.user.create({
        data: {
          name: 'System Administrator',
          staff_id: 'ADMIN001',
          username: 'admin',
          password_hash: hashedPassword,
          role: 'admin'
        }
      });

      console.log('Default admin user created (admin / admin123)');
    } else {
      console.log('Admin user already exists');
    }
  } catch (err) {
    console.error('Failed to seed admin user:', err.message);
    // We don't throw here to allow the server to still start
  }
}

/**
 * Check if the database has application tables and deploy schema if empty.
 * This ensures the server can start against a completely fresh database.
 */
async function initializeDatabase() {
  try {
    // 1. Connect to the database
    await prisma.$connect();
    console.log('Database connected successfully');

    // 2. Check if any application tables exist
    console.log('Checking database schema...');
    const result = await prisma.$queryRaw`
      SELECT COUNT(*)::int AS table_count 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
        AND table_type = 'BASE TABLE'
        AND table_name != '_prisma_migrations'
    `;

    const tableCount = result[0]?.table_count ?? 0;

    if (tableCount === 0) {
      // 3. No tables found — deploy the schema via migrations
      console.log('Empty database detected. Deploying schema...');

      const serverRoot = path.resolve(__dirname, '..', '..');
      try {
        execSync('npx prisma migrate deploy', {
          cwd: serverRoot,
          stdio: 'inherit',
          env: { ...process.env },
        });
        console.log('Schema deployed successfully');
      } catch (migrateErr) {
        console.error('Schema deployment failed:', migrateErr.message);
        throw migrateErr;
      }
    } else {
      console.log(`Database schema is up to date (${tableCount} tables found)`);
    }

    // 4. Seed admin user
    await seedAdminUser();

    // 5. Seed wards (fast — run inline before server opens)
    const { seedWardsIfEmpty } = getSeedWards();
    await seedWardsIfEmpty();

    // 6. Seed diseases & medicines in background (slow — loads ML model).
    //    Done after initializeDatabase() resolves so the HTTP server is already listening.
    setImmediate(() => {
      const { seedDiseasesIfEmpty } = getSeedDiseases();
      const { seedMedicinesIfEmpty } = getSeedMedicines();

      seedDiseasesIfEmpty()
        .catch((err) => console.error('Background disease seeding error:', err.message));

      seedMedicinesIfEmpty()
        .catch((err) => console.error('Background medicine seeding error:', err.message));
    });

  } catch (err) {
    console.error('Database initialization failed:', err.message);
    throw err;
  }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  await prisma.$disconnect();
  process.exit(0);
});

// Export prisma as the default (backwards-compatible with all controllers),
// and attach initializeDatabase as a named property.
prisma.initializeDatabase = initializeDatabase;
module.exports = prisma;
