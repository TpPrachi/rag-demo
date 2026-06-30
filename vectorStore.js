// Simple TF-IDF + cosine similarity (no external vector DB needed)
export function tokenize(text) {
  return text.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/);
}

export function buildTFIDF(docs) {
  const N = docs.length;
  const df = {};
  const tfs = docs.map(doc => {
    const tokens = tokenize(doc);
    const tf = {};
    for (const t of tokens) tf[t] = (tf[t] || 0) + 1 / tokens.length;
    for (const t of Object.keys(tf)) df[t] = (df[t] || 0) + 1;
    return tf;
  });

  const idf = {};
  for (const t in df) idf[t] = Math.log(N / df[t]);

  return tfs.map(tf => {
    const vec = {};
    for (const t in tf) vec[t] = tf[t] * (idf[t] || 0);
    return vec;
  });
}

function cosineSim(a, b) {
  let dot = 0, normA = 0, normB = 0;
  const allKeys = new Set([...Object.keys(a), ...Object.keys(b)]);
  for (const k of allKeys) {
    dot   += (a[k] || 0) * (b[k] || 0);
    normA += (a[k] || 0) ** 2;
    normB += (b[k] || 0) ** 2;
  }
  return normA && normB ? dot / (Math.sqrt(normA) * Math.sqrt(normB)) : 0;
}

export function retrieveTopK(query, docs, vectors, k = 3) {
  const qTokens = tokenize(query);
  const qTF = {};
  for (const t of qTokens) qTF[t] = (qTF[t] || 0) + 1 / qTokens.length;

  // Reuse IDF from corpus (rebuild quickly)
  const allVectors = buildTFIDF([query, ...docs]);
  const qVec = allVectors[0];
  const docVecs = allVectors.slice(1);

  const scored = docs.map((doc, i) => ({
    doc,
    score: cosineSim(qVec, docVecs[i]),
  }));

  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, k)
    .filter(r => r.score > 0)
    .map(r => r.doc);
}