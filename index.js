import { Ollama } from 'ollama';
import Anthropic from '@anthropic-ai/sdk';
import { buildTFIDF, retrieveTopK } from './vectorStore.js';
import { loadDocumentsFromFolder } from './loader.js';

// ── Provider config ───────────────────────────────────────────────
const USE_OLLAMA = process.env.NODE_ENV !== 'production';
const OLLAMA_MODEL = 'llama3.2';
const ANTHROPIC_MODEL = 'claude-sonnet-4-6';

console.log(`🔧 Using: ${USE_OLLAMA ? `Ollama (${OLLAMA_MODEL})` : `Anthropic (${ANTHROPIC_MODEL})`}\n`);

// ── Load documents from folder ────────────────────────────────────
const rawDocs = await loadDocumentsFromFolder('./documents');

// Chunk each doc into ~500 char pieces
function chunkText(text, size = 500, overlap = 50) {
  const chunks = [];
  let i = 0;
  while (i < text.length) {
    chunks.push(text.slice(i, i + size));
    i += size - overlap;
  }
  return chunks;
}

const documents = rawDocs.flatMap(({ file, text }) =>
  chunkText(text).map(chunk => `[${file}] ${chunk}`)
);

console.log(`📦 Total chunks indexed: ${documents.length}\n`);

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
    const anthropic = new Anthropic();
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
  console.log(`❓ Question: ${userQuestion}`);

  const relevant = retrieveTopK(userQuestion, documents, vectors, 3);
  console.log(`📚 Retrieved ${relevant.length} chunk(s):`);
  relevant.forEach((c, i) => console.log(`  [${i + 1}] ${c.slice(0, 100)}...`));

  const context = relevant.join('\n\n');
  const systemPrompt = `You are a helpful assistant. Answer using ONLY the context below.
If the context lacks enough info, say so honestly.

CONTEXT:
${context}`;

  const answer = await callLLM(systemPrompt, userQuestion);
  console.log(`\n🤖 Answer:\n${answer}\n`);
  return answer;
}

// ── Run a query ───────────────────────────────────────────────────
const question = process.argv[2] || 'Summarize the documents.';
await ragQuery(question);