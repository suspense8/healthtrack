/**
 * Disease Seeding Script
 * 
 * Parses GHE_FULL_DD_enriched.csv and populates the diseases table
 * with vector embeddings for semantic search.
 * 
 * Usage: node scripts/seedDiseases.js
 */

const { PrismaClient } = require('@prisma/client');
const { parse } = require('csv-parse');
const fs = require('fs');
const path = require('path');

// Dynamic import for ES module
let pipeline;

const prisma = new PrismaClient();

const CSV_PATH = path.join(__dirname, '../data/GHE_FULL_DD_enriched.csv');
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

async function parseCSV() {
  return new Promise((resolve, reject) => {
    const records = [];
    const seen = new Set(); // Deduplicate by disease name
    
    const parser = fs.createReadStream(CSV_PATH)
      .pipe(parse({
        columns: true,
        skip_empty_lines: true,
        relax_column_count: true
      }));

    parser.on('data', (row) => {
      const name = row.DIM_GHECAUSE_TITLE?.trim();
      if (!name || seen.has(name)) return;
      
      seen.add(name);
      records.push({
        name: name,
        description: row.wikipedia_description?.trim() || '',
        extract: row.wikipedia_extract?.trim() || '',
        wikipedia_url: row.wikipedia_url?.trim() || null
      });
    });

    parser.on('end', () => resolve(records));
    parser.on('error', reject);
  });
}

async function seedDiseases() {
  try {
    console.log('Starting disease seeding process...\n');
    
    // 1. Initialize embedding model
    await initializeEmbedder();
    
    // 2. Parse CSV
    console.log('Parsing CSV file...');
    const diseases = await parseCSV();
    console.log(`Found ${diseases.length} unique diseases.\n`);
    
    // 3. Clear existing diseases
    console.log('Clearing existing disease records...');
    await prisma.$executeRaw`TRUNCATE TABLE diseases RESTART IDENTITY`;
    console.log('Done.\n');
    
    // 4. Process in batches
    console.log(`Processing ${diseases.length} diseases in batches of ${BATCH_SIZE}...`);
    let processed = 0;
    
    for (let i = 0; i < diseases.length; i += BATCH_SIZE) {
      const batch = diseases.slice(i, i + BATCH_SIZE);
      
      for (const disease of batch) {
        // Combine name + description + extract for embedding
        const textForEmbedding = [
          disease.name,
          disease.description,
          disease.extract?.substring(0, 1000) // Limit extract length
        ].filter(Boolean).join('. ');
        
        try {
          const embedding = await generateEmbedding(textForEmbedding);
          const embeddingStr = formatEmbeddingForPg(embedding);
          
          await prisma.$executeRaw`
            INSERT INTO diseases (name, description, extract, wikipedia_url, embedding, created_at)
            VALUES (
              ${disease.name}, 
              ${disease.description}, 
              ${disease.extract || null}, 
              ${disease.wikipedia_url},
              ${embeddingStr}::vector,
              NOW()
            )
          `;
          
          processed++;
        } catch (err) {
          console.error(`Error processing "${disease.name}":`, err.message);
        }
      }
      
      console.log(`  Processed ${Math.min(processed, diseases.length)}/${diseases.length} diseases...`);
    }
    
    console.log(`\n✅ Seeding complete! Inserted ${processed} diseases with embeddings.`);
    
  } catch (error) {
    console.error('Seeding failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run if called directly
if (require.main === module) {
  seedDiseases()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}

module.exports = { seedDiseases, generateEmbedding };
