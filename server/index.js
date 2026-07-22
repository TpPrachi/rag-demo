import express from 'express';
import cors from 'cors';
import multer from 'multer';
import path from 'path';
import { initRAG, streamRAGResponse, reindexDocuments } from './rag.js';

const app = express();
app.use(cors());
app.use(express.json());

// ── Multer config — save to documents/ folder ─────────────────────
const storage = multer.diskStorage({
  destination: './documents/',
  filename: (req, file, cb) => {
    // Keep original filename, avoid collisions with timestamp
    const ext = path.extname(file.originalname);
    const name = path.basename(file.originalname, ext);
    cb(null, `${name}-${Date.now()}${ext}`);
  },
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const allowed = ['.txt', '.pdf'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) cb(null, true);
    else cb(new Error(`Only .txt and .pdf files are allowed`));
  },
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB max
});

// ── Upload endpoint ───────────────────────────────────────────────
app.post('/api/upload', upload.array('files', 10), async (req, res) => {
  try {
    const uploaded = req.files.map(f => ({
      name: f.originalname,
      saved: f.filename,
      size: f.size,
    }));

    console.log(`📁 Uploaded ${uploaded.length} file(s), reindexing...`);

    // Reindex all documents including new ones
    await reindexDocuments();

    res.json({ success: true, files: uploaded });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── List uploaded documents ───────────────────────────────────────
app.get('/api/documents', async (req, res) => {
  const { readdir, stat } = await import('fs/promises');
  const files = await readdir('./documents');
  const docs = await Promise.all(
    files
      .filter(f => f.endsWith('.txt') || f.endsWith('.pdf'))
      .map(async f => {
        const s = await stat(`./documents/${f}`);
        return { name: f, size: s.size, modified: s.mtime };
      })
  );
  res.json({ docs });
});

// ── Stream endpoint ───────────────────────────────────────────────
app.get('/api/ask', async (req, res) => {
  const question = req.query.q;
  if (!question) return res.status(400).json({ error: 'No question provided' });

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  const send = (event, data) => {
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  };

  try {
    await streamRAGResponse(
      question,
      (chunk) => send('chunk', { text: chunk }),
      (sources) => send('sources', { sources }),
    );
    send('done', {});
  } catch (err) {
    send('error', { message: err.message });
  } finally {
    res.end();
  }
});

// ── Start ─────────────────────────────────────────────────────────
await initRAG();
app.listen(3001, () => console.log('🚀 Server running at http://localhost:3001'));