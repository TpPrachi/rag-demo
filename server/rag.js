import { Ollama } from 'ollama';
import Anthropic from '@anthropic-ai/sdk';
import { loadDocumentsFromFolder } from '../loader.js';
import { indexDocuments, retrieveTopK } from '../vectorStore.js';
import { saveQA, searchMemory } from './memory.js';

const USE_OLLAMA = process.env.NODE_ENV !== 'production';
const OLLAMA_MODEL = 'llama3.2';
const ANTHROPIC_MODEL = 'claude-sonnet-4-6';

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

export async function initRAG() {
    const rawDocs = await loadDocumentsFromFolder('./documents');
    const documents = rawDocs.flatMap(({ file, text }) => {
        if (file === 'qa-memory.json') return []; // skip JSON backup file
        const chunks = chunkText(text);
        console.log(`  → ${file}: ${chunks.length} chunk(s)`);
        return chunks.map((chunk, i) => `[${file} chunk ${i + 1}] ${chunk}`);
    });
    await indexDocuments(documents);
    console.log('✅ RAG ready\n');
}

export async function streamRAGResponse(question, onChunk, onSources) {
    // Retrieve from both docs AND memory in parallel
    const [docResults, memoryResults] = await Promise.all([
        retrieveTopK(question, 3),
        searchMemory(question, 2),
    ]);

    // Merge, dedupe, sort by score
    const allResults = [...docResults, ...memoryResults]
        .sort((a, b) => b.score - a.score)
        .slice(0, 4);

    onSources(allResults.map(r => ({ doc: r.doc, score: r.score })));

    const context = allResults.map(r => r.doc).join('\n\n');
    const systemPrompt = `You are a helpful assistant for the RAG Demo application.
Answer using the context below. If the question is a shorter version of something
covered in the context (e.g. "What is RAG?" means "What is Retrieval-Augmented Generation?"),
still answer it using the context.
If the answer is truly not in the context, say "I don't know based on the provided documents."
Do NOT use your own training knowledge.

CONTEXT:
${context}`;

    // Collect full answer to save later
    let fullAnswer = '';

    if (USE_OLLAMA) {
        const ollama = new Ollama();
        const stream = await ollama.chat({
            model: OLLAMA_MODEL,
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: question },
            ],
            stream: true,
        });
        for await (const chunk of stream) {
            const text = chunk.message.content;
            fullAnswer += text;
            onChunk(text);
        }
    } else {
        const anthropic = new Anthropic();
        const stream = anthropic.messages.stream({
            model: ANTHROPIC_MODEL,
            max_tokens: 1024,
            system: systemPrompt,
            messages: [{ role: 'user', content: question }],
        });
        for await (const chunk of stream) {
            if (chunk.type === 'content_block_delta') {
                fullAnswer += chunk.delta.text;
                onChunk(chunk.delta.text);
            }
        }
    }

    // Auto-save Q&A to memory after response completes
    await saveQA(question, fullAnswer);
    console.log(`💾 Q&A saved to memory`);
}

// ── Reindex all documents (called after upload) ───────────────────
export async function reindexDocuments() {
    const rawDocs = await loadDocumentsFromFolder('./documents');
    const documents = rawDocs.flatMap(({ file, text }) => {
        if (file === 'qa-memory.json') return [];
        const chunks = chunkText(text);
        console.log(`  → ${file}: ${chunks.length} chunk(s)`);
        return chunks.map((chunk, i) => `[${file} chunk ${i + 1}] ${chunk}`);
    });
    await indexDocuments(documents);
    console.log('✅ Reindexed all documents\n');
}