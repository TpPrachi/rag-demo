import axios from 'axios';

export async function getEmbedding(text) {
  const response = await axios.post('http://localhost:11434/api/embeddings', {
    model: 'nomic-embed-text',
    prompt: text,
  });
  return response.data.embedding;
}

export async function getEmbeddings(texts) {
  const embeddings = [];
  for (const text of texts) {
    const embedding = await getEmbedding(text);
    embeddings.push(embedding);
  }
  return embeddings;
}