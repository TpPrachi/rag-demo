import fs from 'fs/promises';
import path from 'path';
import { getEmbedding } from '../embedder.js';
import { ChromaClient } from 'chromadb';

const client = new ChromaClient({ host: 'localhost', port: 8000, ssl: false });
const QA_COLLECTION = 'qa-memory';
const QA_FILE = './documents/qa-memory.json';

// ── Get or create QA collection ───────────────────────────────────
async function getQACollection() {
  try {
    return await client.getCollection({ name: QA_COLLECTION, embeddingFunction: null });
  } catch {
    return await client.createCollection({
      name: QA_COLLECTION,
      metadata: { 'hnsw:space': 'cosine' },
      embeddingFunction: null,
    });
  }
}

// ── Save Q&A pair ─────────────────────────────────────────────────
export async function saveQA(question, answer) {
  const collection = await getQACollection();
  const text = `Q: ${question}\nA: ${answer}`;
  const embedding = await getEmbedding(text);
  const id = `qa-${Date.now()}`;

  // Save to ChromaDB
  await collection.add({
    ids: [id],
    embeddings: [embedding],
    documents: [text],
    metadatas: [{ question, timestamp: new Date().toISOString() }],
  });

  // Also save to disk as JSON backup
  let existing = [];
  try {
    const raw = await fs.readFile(QA_FILE, 'utf-8');
    existing = JSON.parse(raw);
  } catch {}
  existing.push({ id, question, answer, timestamp: new Date().toISOString() });
  await fs.writeFile(QA_FILE, JSON.stringify(existing, null, 2));

  console.log(`💾 Saved Q&A to memory: "${question.slice(0, 50)}..."`);
}

// ── Search past Q&As ──────────────────────────────────────────────
export async function searchMemory(question, k = 2) {
  try {
    const collection = await getQACollection();
    const count = await collection.count();
    if (count === 0) return [];

    const embedding = await getEmbedding(question);
    const results = await collection.query({
      queryEmbeddings: [embedding],
      nResults: Math.min(k, count),
    });

    return results.documents[0].map((doc, i) => ({
      doc,
      score: 1 - results.distances[0][i],
    }));
  } catch {
    return [];
  }
}