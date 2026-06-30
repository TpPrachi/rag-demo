import { Ollama } from 'ollama';
import Anthropic from '@anthropic-ai/sdk';
import { buildTFIDF, retrieveTopK } from './vectorStore.js';

// ── Provider config ───────────────────────────────────────────────
const USE_OLLAMA = process.env.NODE_ENV !== 'production';

const OLLAMA_MODEL = 'llama3.2';        // any model you've pulled
const ANTHROPIC_MODEL = 'claude-sonnet-4-6';

console.log(`🔧 Using: ${USE_OLLAMA ? `Ollama (${OLLAMA_MODEL})` : `Anthropic (${ANTHROPIC_MODEL})`}`);

// ── Knowledge base ────────────────────────────────────────────────
const documents = [
  "Node.js is a JavaScript runtime built on Chrome's V8 engine for server-side development.",
  "RAG stands for Retrieval-Augmented Generation. It combines a retrieval system with an LLM.",
  "The Anthropic Claude API supports streaming, tool use, and vision capabilities.",
  "Vector databases like Pinecone, Weaviate, or pgvector store embeddings for semantic search.",
  "TF-IDF is a classic keyword-based retrieval method that doesn't require embeddings.",
  "Chunking splits long documents into smaller pieces before indexing for better retrieval.",
  "claude-sonnet-4-6 is a fast and capable model suitable for production workloads.",
  "In RAG, retrieved context is injected into the prompt so the LLM can ground its answer.",
];

const vectors = buildTFIDF(documents);

// ── Unified LLM call ──────────────────────────────────────────────
async function callLLM(systemPrompt, userMessage) {
  if (USE_OLLAMA) {
    const ollama = new Ollama();
    const response = await ollama.chat({
      model: OLLAMA_MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user',   content: userMessage  },
      ],
    });
    return response.message.content;
  } else {
    const anthropic = new Anthropic(); // reads ANTHROPIC_API_KEY automatically
    const response = await anthropic.messages.create({
      model: ANTHROPIC_MODEL,
      max_tokens: 1024,
      system: systemPrompt,
      messages: [{ role: 'user', content: userMessage }],
    });
    return response.content[0].text;
  }
}

// ── RAG pipeline ──────────────────────────────────────────────────
async function ragQuery(userQuestion) {
  console.log(`\n❓ Question: ${userQuestion}`);

  const relevant = retrieveTopK(userQuestion, documents, vectors, 3);
  console.log(`\n📚 Retrieved ${relevant.length} chunk(s):`);
  relevant.forEach((c, i) => console.log(`  [${i + 1}] ${c}`));

  const context = relevant.join('\n\n');
  const systemPrompt = `You are a helpful assistant. Answer using ONLY the context below.
If the context lacks enough info, say so honestly.

CONTEXT:
${context}`;

  const answer = await callLLM(systemPrompt, userQuestion);
  console.log(`\n🤖 Answer:\n${answer}`);
  return answer;
}

// ── Run queries ───────────────────────────────────────────────────
await ragQuery('What is RAG and how does it work?');
await ragQuery('Which model should I use for production?');