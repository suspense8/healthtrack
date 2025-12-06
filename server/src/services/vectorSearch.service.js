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
 * Search diseases by symptoms using vector similarity
 * 
 * @param {string} symptomDescription - Natural language description of symptoms
 * @param {object} options - Search options
 * @param {number} options.limit - Max results to return (default 10)
 * @param {number} options.minSimilarity - Minimum similarity threshold (default 0.3)
 * @returns {Promise<Array>} Array of matching diseases with similarity scores
 */
async function searchDiseases(symptomDescription, options = {}) {
  const { limit = 10, minSimilarity = 0.3 } = options;
  
  if (!symptomDescription?.trim()) {
    return [];
  }

  try {
    // Generate embedding for the query
    const queryEmbedding = await generateQueryEmbedding(symptomDescription);
    const embeddingStr = `[${queryEmbedding.join(',')}]`;
    
    // Query using pgvector cosine distance operator (<=>)
    // 1 - distance = similarity (cosine distance is 1 - cosine similarity)
    const results = await prisma.$queryRaw`
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
    
    // Filter by minimum similarity and format results
    return results
      .filter(r => r.similarity >= minSimilarity)
      .map(r => ({
        id: r.id,
        name: r.name,
        description: r.description,
        extract: r.extract,
        wikipediaUrl: r.wikipedia_url,
        similarity: Math.round(r.similarity * 100) / 100, // Round to 2 decimals
        matchPercentage: Math.round(r.similarity * 100) // Percentage for UI
      }));
      
  } catch (error) {
    console.error('Vector search error:', error);
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
