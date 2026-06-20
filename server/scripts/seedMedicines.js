/**
 * Medicine Seeding Script
 * 
 * Parses medicines.json and populates the medicines table
 * with vector embeddings for semantic search.
 * 
 * Usage: node scripts/seedMedicines.js
 */

const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

// Dynamic import for ES module
let pipeline;

const prisma = new PrismaClient();

// Allow using cleaned file if it exists, otherwise use original
const JSON_PATH = fs.existsSync(path.join(__dirname, '../data/medicines_cleaned.json'))
  ? path.join(__dirname, '../data/medicines_cleaned.json')
  : path.join(__dirname, '../data/medicines.json');
const BATCH_SIZE = 50; // Process in batches to avoid memory issues

async function initializeEmbedder() {
  console.log('Loading transformers.js model (this may take a moment on first run)...');
  const { pipeline: pipelineFn } = await import('@xenova/transformers');
  pipeline = await pipelineFn('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
  console.log('Model loaded successfully!');
}

async function generateEmbedding(text) {
  const output = await pipeline(text, { pooling: 'mean', normalize: true });
  return Array.from(output.data);
}

function formatEmbeddingForPg(embedding) {
  return `[${embedding.join(',')}]`;
}

function formatIngredients(ingredients) {
  if (!ingredients || !Array.isArray(ingredients)) return null;

  return ingredients.map(ing => {
    if (ing.quantity && ing.unit) {
      return `${ing.name} (${ing.quantity} ${ing.unit})`;
    }
    return ing.name;
  }).join(', ');
}

function generateDescription(medicine) {
  const parts = [];

  if (medicine.name) parts.push(medicine.name);
  if (medicine.generic_name && medicine.generic_name.toLowerCase() !== medicine.name.toLowerCase()) {
    parts.push(`Generic: ${medicine.generic_name}`);
  }
  if (medicine.manufacturer) parts.push(`Manufacturer: ${medicine.manufacturer}`);
  if (medicine.title) parts.push(medicine.title.substring(0, 200)); // Limit title length

  return parts.join('. ');
}

async function parseMedicines() {
  const fileName = JSON_PATH.includes('medicines_cleaned') ? 'medicines_cleaned.json' : 'medicines.json';
  console.log(`Reading ${fileName} file...`);
  const fileContent = fs.readFileSync(JSON_PATH, 'utf-8');
  const medicinesData = JSON.parse(fileContent);

  console.log(`Found ${medicinesData.length} medicine entries in JSON.`);

  const medicines = [];
  const seen = new Set(); // Deduplicate by normalized name only (already cleaned)

  for (const entry of medicinesData) {
    if (!entry.products || !Array.isArray(entry.products) || entry.products.length === 0) {
      continue;
    }

    for (const product of entry.products) {
      if (!product.name) continue;

      // Normalize name for deduplication (case-insensitive, trimmed)
      const normalizedName = product.name.toLowerCase().trim();

      // Skip if we've already seen this exact name (additional safety check)
      if (seen.has(normalizedName)) {
        console.log(`   Skipping duplicate: ${product.name}`);
        continue;
      }

      seen.add(normalizedName);

      const ingredientsText = formatIngredients(product.ingredients);
      const description = generateDescription({
        name: product.name,
        generic_name: product.generic_name,
        manufacturer: entry.manufacturer,
        title: entry.title
      });

      medicines.push({
        name: product.name.trim(),
        generic_name: product.generic_name?.trim() || null,
        ndc_code: product.ndc_code?.trim() || null,
        manufacturer: entry.manufacturer?.trim() || null,
        title: entry.title?.trim() || null,
        ingredients: ingredientsText || null,
        description: description
      });
    }
  }

  console.log(`Extracted ${medicines.length} unique medicines from products.\n`);
  return medicines;
}

async function seedMedicines() {
  try {
    console.log('Starting medicine seeding process...\n');

    // 1. Initialize embedding model
    await initializeEmbedder();

    // 2. Parse JSON
    console.log('Parsing medicines.json file...');
    const medicines = await parseMedicines();

    // 3. Clear existing medicines
    console.log('Clearing existing medicine records...');
    // Use DELETE instead of TRUNCATE to respect foreign key constraints
    // This will set medicine_id to NULL in prescriptions (due to onDelete: SetNull)
    await prisma.$executeRaw`DELETE FROM medicines`;
    // Reset the sequence
    await prisma.$executeRaw`ALTER SEQUENCE medicines_id_seq RESTART WITH 1`;
    console.log('Done.\n');

    // 4. Process in batches
    console.log(`Processing ${medicines.length} medicines in batches of ${BATCH_SIZE}...`);
    let processed = 0;

    for (let i = 0; i < medicines.length; i += BATCH_SIZE) {
      const batch = medicines.slice(i, i + BATCH_SIZE);

      for (const medicine of batch) {
        // Combine name + generic_name + description + ingredients for embedding
        const textForEmbedding = [
          medicine.name,
          medicine.generic_name,
          medicine.description,
          medicine.ingredients?.substring(0, 500) // Limit ingredients length
        ].filter(Boolean).join('. ');

        try {
          const embedding = await generateEmbedding(textForEmbedding);
          const embeddingStr = formatEmbeddingForPg(embedding);

          await prisma.$executeRaw`
            INSERT INTO medicines (name, generic_name, ndc_code, manufacturer, title, ingredients, description, embedding, quantity, reorder_level, unit, created_at, updated_at)
            VALUES (
              ${medicine.name}, 
              ${medicine.generic_name || null},
              ${medicine.ndc_code || null},
              ${medicine.manufacturer || null},
              ${medicine.title || null},
              ${medicine.ingredients || null},
              ${medicine.description || null},
              ${embeddingStr}::vector,
              0,
              10,
              'units',
              NOW(),
              NOW()
            )
          `;

          processed++;
        } catch (err) {
          console.error(`Error processing "${medicine.name}":`, err.message);
        }
      }

      console.log(`  Processed ${Math.min(processed, medicines.length)}/${medicines.length} medicines...`);
    }

    console.log(`\n✅ Seeding complete! Inserted ${processed} medicines with embeddings.`);

  } catch (error) {
    console.error('Seeding failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run if called directly
if (require.main === module) {
  seedMedicines()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}

/**
 * Idempotent version — skips seeding if medicines table already has rows.
 * Safe to call on every startup (runs in background after server is listening).
 */
async function seedMedicinesIfEmpty() {
  try {
    const existing = await prisma.$queryRaw`SELECT COUNT(*)::int AS c FROM medicines`;
    const count = existing[0]?.c ?? 0;
    if (count > 0) {
      console.log(`💊 Medicines already seeded (${count} records found), skipping.`);
      return;
    }

    console.log('💊 No medicines found. Starting background medicine seeding (this may take a while)...');

    // Parse JSON (no model needed yet)
    const medicines = await parseMedicines();
    console.log(`💊 Found ${medicines.length} medicines. Loading embedding model...`);

    // Only load the model when we actually need it
    await initializeEmbedder();

    let processed = 0;
    for (let i = 0; i < medicines.length; i += BATCH_SIZE) {
      const batch = medicines.slice(i, i + BATCH_SIZE);
      for (const medicine of batch) {
        const textForEmbedding = [
          medicine.name,
          medicine.generic_name,
          medicine.description,
          medicine.ingredients?.substring(0, 500)
        ].filter(Boolean).join('. ');

        try {
          const embedding = await generateEmbedding(textForEmbedding);
          const embeddingStr = formatEmbeddingForPg(embedding);

          await prisma.$executeRaw`
            INSERT INTO medicines (name, generic_name, ndc_code, manufacturer, title, ingredients, description, embedding, quantity, reorder_level, unit, created_at, updated_at)
            VALUES (
              ${medicine.name},
              ${medicine.generic_name || null},
              ${medicine.ndc_code || null},
              ${medicine.manufacturer || null},
              ${medicine.title || null},
              ${medicine.ingredients || null},
              ${medicine.description || null},
              ${embeddingStr}::vector,
              0,
              10,
              'units',
              NOW(),
              NOW()
            )
            ON CONFLICT DO NOTHING
          `;
          processed++;
        } catch (err) {
          console.error(`💊 Error inserting "${medicine.name}":`, err.message);
        }
      }
      if ((i / BATCH_SIZE) % 5 === 0) {
        console.log(`💊 Medicines: ${Math.min(processed, medicines.length)}/${medicines.length} seeded...`);
      }
    }

    console.log(`✅ Medicine seeding complete! Inserted ${processed} medicines with vector embeddings.`);
  } catch (error) {
    console.error('Medicine seeding failed:', error.message);
    // Don't throw — server continues running
  }
}

module.exports = { seedMedicines, seedMedicinesIfEmpty, generateEmbedding };


