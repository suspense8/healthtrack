/**
 * Vector Search Service
 * 
 * Provides semantic search over the disease database using pgvector.
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Cache the embedding pipeline
let embedder = null;

async function getEmbedder() {
  if (!embedder) {
    const { pipeline } = await import('@xenova/transformers');
    embedder = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
  }
  return embedder;
}

/**
 * Generate embedding for a text query
 */
async function generateQueryEmbedding(text) {
  const pipeline = await getEmbedder();
  const output = await pipeline(text, { pooling: 'mean', normalize: true });
  return Array.from(output.data);
}

/**
 * Search diseases by name OR symptoms using hybrid search
 * 
 * Strategy:
 * 1. First, find diseases with matching names (exact or partial)
 * 2. Then, do vector similarity search for symptom-based matching
 * 3. Combine results, prioritizing name matches
 * 
 * @param {string} query - Disease name or symptom description
 * @param {object} options - Search options
 * @param {number} options.limit - Max results to return (default 10)
 * @param {number} options.minSimilarity - Minimum similarity threshold (default 0.3)
 * @returns {Promise<Array>} Array of matching diseases with similarity scores
 */
async function searchDiseases(query, options = {}) {
  const { limit = 10, minSimilarity = 0.3 } = options;
  
  if (!query?.trim()) {
    return [];
  }

  const searchQuery = query.trim();

  try {
    // Step 1: Search by name (exact or partial match) - PRIORITIZED
    const nameMatches = await prisma.$queryRaw`
      SELECT 
        id,
        name,
        description,
        extract,
        wikipedia_url,
        CASE 
          WHEN LOWER(name) = LOWER(${searchQuery}) THEN 1.0
          WHEN LOWER(name) LIKE LOWER(${searchQuery + '%'}) THEN 0.95
          WHEN LOWER(name) LIKE LOWER(${'%' + searchQuery + '%'}) THEN 0.90
          ELSE 0.85
        END as similarity
      FROM diseases
      WHERE LOWER(name) LIKE LOWER(${'%' + searchQuery + '%'})
      ORDER BY 
        CASE 
          WHEN LOWER(name) = LOWER(${searchQuery}) THEN 1
          WHEN LOWER(name) LIKE LOWER(${searchQuery + '%'}) THEN 2
          ELSE 3
        END,
        name ASC
      LIMIT ${Math.ceil(limit / 3)}
    `;

    // Step 2: Fuzzy search for misspelled names using pg_trgm
    // This catches typos like "malaria" -> "maleria", "diabetes" -> "diabetis"
    const fuzzyMatches = await prisma.$queryRaw`
      SELECT 
        id,
        name,
        description,
        extract,
        wikipedia_url,
        similarity(LOWER(name), LOWER(${searchQuery})) as similarity
      FROM diseases
      WHERE similarity(LOWER(name), LOWER(${searchQuery})) > 0.25
      ORDER BY similarity(LOWER(name), LOWER(${searchQuery})) DESC
      LIMIT ${Math.ceil(limit / 3)}
    `;

    // Step 3: Vector similarity search for symptom-based matching
    const queryEmbedding = await generateQueryEmbedding(searchQuery);
    const embeddingStr = `[${queryEmbedding.join(',')}]`;
    
    const vectorMatches = await prisma.$queryRaw`
      SELECT 
        id,
        name,
        description,
        extract,
        wikipedia_url,
        1 - (embedding <=> ${embeddingStr}::vector) as similarity
      FROM diseases
      WHERE embedding IS NOT NULL
      ORDER BY embedding <=> ${embeddingStr}::vector
      LIMIT ${limit}
    `;

    // Step 4: Combine results, prioritizing exact > fuzzy > vector
    const seenIds = new Set();
    const combinedResults = [];

    // Add exact name matches first (highest priority)
    for (const match of nameMatches) {
      seenIds.add(match.id);
      combinedResults.push({
        id: match.id,
        name: match.name,
        description: match.description,
        extract: match.extract,
        wikipediaUrl: match.wikipedia_url,
        similarity: Number(match.similarity),
        matchPercentage: Math.round(Number(match.similarity) * 100),
        matchType: 'name'
      });
    }

    // Add fuzzy matches (for misspellings)
    for (const match of fuzzyMatches) {
      if (!seenIds.has(match.id)) {
        seenIds.add(match.id);
        combinedResults.push({
          id: match.id,
          name: match.name,
          description: match.description,
          extract: match.extract,
          wikipediaUrl: match.wikipedia_url,
          similarity: Math.round(Number(match.similarity) * 100) / 100,
          matchPercentage: Math.round(Number(match.similarity) * 100),
          matchType: 'fuzzy'
        });
      }
    }

    // Add vector matches that aren't already included
    for (const match of vectorMatches) {
      if (!seenIds.has(match.id) && match.similarity >= minSimilarity) {
        seenIds.add(match.id);
        combinedResults.push({
          id: match.id,
          name: match.name,
          description: match.description,
          extract: match.extract,
          wikipediaUrl: match.wikipedia_url,
          similarity: Math.round(Number(match.similarity) * 100) / 100,
          matchPercentage: Math.round(Number(match.similarity) * 100),
          matchType: 'symptoms'
        });
      }
    }

    // Return up to limit results
    return combinedResults.slice(0, limit);
      
  } catch (error) {
    console.error('Hybrid search error:', error);
    throw error;
  }
}

/**
 * Get disease by ID
 */
async function getDiseaseById(id) {
  const result = await prisma.$queryRaw`
    SELECT id, name, description, extract, wikipedia_url
    FROM diseases
    WHERE id = ${parseInt(id)}
  `;
  return result[0] || null;
}

module.exports = {
  searchDiseases,
  getDiseaseById,
  generateQueryEmbedding
};
