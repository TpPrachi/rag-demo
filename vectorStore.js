import { ChromaClient } from 'chromadb';
import { getEmbedding, getEmbeddings } from './embedder.js';

const client = new ChromaClient({
  host: 'localhost',
  port: 8000,
  ssl: false,
});
const COLLECTION_NAME = 'rag-demo';

// ── Index documents ───────────────────────────────────────────────
export async function indexDocuments(chunks) {
  // Delete old collection if exists and recreate
  try {
    await client.deleteCollection({ name: COLLECTION_NAME });
  } catch { }

  const collection = await client.createCollection({
    name: COLLECTION_NAME,
    metadata: { 'hnsw:space': 'cosine' },
    embeddingFunction: null,
  });

  console.log(`🔢 Generating embeddings for ${chunks.length} chunks...`);
  const embeddings = await getEmbeddings(chunks);

  // Add in batches of 50
  const batchSize = 50;
  for (let i = 0; i < chunks.length; i += batchSize) {
    const batch = chunks.slice(i, i + batchSize);
    const batchEmbeddings = embeddings.slice(i, i + batchSize);

    await collection.add({
      ids: batch.map((_, j) => `chunk-${i + j}`),
      embeddings: batchEmbeddings,
      documents: batch,
    });
    console.log(`  indexed batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(chunks.length / batchSize)}`);
  }

  console.log(`✅ Indexed ${chunks.length} chunks into Chroma\n`);
}

// ── Retrieve top K ────────────────────────────────────────────────
export async function retrieveTopK(query, k = 3) {
  const collection = await client.getCollection({
    name: COLLECTION_NAME,
    embeddingFunction: null,
  });
  const queryEmbedding = await getEmbedding(query);

  const results = await collection.query({
    queryEmbeddings: [queryEmbedding],
    nResults: k,
  });

  return results.documents[0].map((doc, i) => ({
    doc,
    score: 1 - results.distances[0][i],
  }));
}