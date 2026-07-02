import { Ollama } from 'ollama';
import Anthropic from '@anthropic-ai/sdk';
import { loadDocumentsFromFolder } from './loader.js';
import { indexDocuments, retrieveTopK } from './vectorStore.js';

// ── Provider config ───────────────────────────────────────────────
const USE_OLLAMA = process.env.NODE_ENV !== 'production';
const OLLAMA_MODEL = 'llama3.2';
const ANTHROPIC_MODEL = 'claude-sonnet-4-6';

console.log(`🔧 Using: ${USE_OLLAMA ? `Ollama (${OLLAMA_MODEL})` : `Anthropic (${ANTHROPIC_MODEL})`}\n`);

// ── Smart chunking ────────────────────────────────────────────────
function chunkText(text, maxChunkSize = 500, overlap = 1) {
  const paragraphs = text.split(/\n{2,}/).map(p => p.trim()).filter(p => p.length > 0);
  const chunks = [];
  let currentChunk = [];
  let currentSize = 0;

  for (const paragraph of paragraphs) {
    const sentences = paragraph.split(/(?<=[.!?])\s+/).map(s => s.trim()).filter(s => s.length > 0);

    for (const sentence of sentences) {
      if (currentSize + sentence.length > maxChunkSize && currentChunk.length > 0) {
        chunks.push(currentChunk.join(' '));
        currentChunk = currentChunk.slice(-overlap);
        currentSize = currentChunk.join(' ').length;
      }
      currentChunk.push(sentence);
      currentSize += sentence.length;
    }

    if (currentChunk.length > 0) {
      chunks.push(currentChunk.join(' '));
      currentChunk = [];
      currentSize = 0;
    }
  }

  if (currentChunk.length > 0) chunks.push(currentChunk.join(' '));
  return chunks;
}

// ── Load & index documents ────────────────────────────────────────
const rawDocs = await loadDocumentsFromFolder('./documents');
const documents = rawDocs.flatMap(({ file, text }) => {
  const chunks = chunkText(text);
  console.log(`  → ${file}: ${chunks.length} chunk(s)`);
  return chunks.map((chunk, i) => `[${file} chunk ${i + 1}] ${chunk}`);
});

await indexDocuments(documents);

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

  const results = await retrieveTopK(userQuestion, 3);
  console.log(`\n📚 Retrieved ${results.length} chunk(s):`);
  results.forEach((r, i) =>
    console.log(`  [${i + 1}] (score: ${r.score.toFixed(3)}) ${r.doc.slice(0, 100)}...`)
  );

  const context = results.map(r => r.doc).join('\n\n');
  const systemPrompt = `You are a helpful assistant. Answer using ONLY the context below.
If the answer is not in the context, say "I don't know based on the provided documents."
Do NOT use your own training knowledge.

CONTEXT:
${context}`;

  const answer = await callLLM(systemPrompt, userQuestion);
  console.log(`\n🤖 Answer:\n${answer}\n`);
  return answer;
}

// ── Run ───────────────────────────────────────────────────────────
const question = process.argv[2] || 'What are the main topics covered?';
await ragQuery(question);