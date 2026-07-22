# RAG Demo with Node.js

A production-style Retrieval-Augmented Generation (RAG) application built with Node.js, React, ChromaDB, and Ollama. Works fully offline for development and switches to Anthropic Claude for production.

## What is RAG?

RAG combines a retrieval system with a Large Language Model (LLM). Instead of relying on the model's training data, it:
1. **Retrieves** relevant chunks from your documents + past Q&A memory
2. **Augments** the prompt with that context
3. **Generates** an answer grounded only in your documents

## Features

- 📄 Load real documents (`.txt` and `.pdf`)
- ✂️ Smart chunking (sentence + paragraph aware)
- 🔍 Semantic search with Ollama embeddings (`nomic-embed-text`)
- 🗄️ ChromaDB vector store (persisted to disk)
- 💾 Auto-save Q&A memory (gets smarter with every question)
- 📁 Multi-file upload via UI (drag & drop or click to browse)
- ⚡ Streaming responses word by word (SSE)
- 💬 React chat UI with dark theme
- 🦙 Local inference with Ollama (free, offline)
- ☁️ Switch to Anthropic Claude for production with one env var

## Project Structure

```
rag-demo/
├── server/
│   ├── index.js          # Express API with SSE streaming + file upload
│   ├── rag.js            # RAG pipeline + reindexing
│   └── memory.js         # Auto-save Q&A memory
├── client/
│   ├── index.html
│   └── src/
│       ├── main.jsx
│       └── App.jsx       # React chat UI with drag & drop upload
├── vectorStore.js        # ChromaDB retrieval
├── embedder.js           # Ollama nomic-embed-text embeddings
├── loader.js             # Document loader (txt + pdf)
├── documents/            # Drop your files here
│   ├── test_demo.txt
│   └── qa-memory.json    # Auto-generated Q&A memory
├── chroma-data/          # ChromaDB persisted data
├── vite.config.js
└── package.json
```

## Tech Stack

| Layer | Tool |
|---|---|
| LLM (dev) | Ollama `llama3.2` |
| LLM (prod) | Anthropic `claude-sonnet-4-6` |
| Embeddings | Ollama `nomic-embed-text` |
| Vector DB | ChromaDB (local) |
| Backend | Express.js + SSE streaming + Multer |
| Frontend | React + Vite |

## Prerequisites

- Node.js v18+
- Python 3.9+
- [Ollama](https://ollama.com) installed locally

## Setup

### 1. Clone the repo
```bash
git clone https://github.com/TpPrachi/rag-demo.git
cd rag-demo
```

### 2. Install Node dependencies
```bash
npm install
```

### 3. Install ChromaDB
```bash
python3 -m pip install chromadb
```

### 4. Install Ollama & pull models
```bash
# Linux
curl -fsSL https://ollama.com/install.sh | sh

# Pull LLM and embedding models
ollama pull llama3.2
ollama pull nomic-embed-text
```

### 5. Add your documents
Drop any `.txt` or `.pdf` files into the `documents/` folder, or upload them directly via the UI.

```bash
# Example: add personal info
cat >> documents/test_demo.txt << 'EOF'
My name is Prachi Thacker.
I am located in San Jose, California, USA.
EOF
```

## Running the App

You need 3 terminals:

```bash
# Terminal 1 — ChromaDB vector store
/Users/<<user>>/Library/Python/3.9/bin/chroma run --path ./chroma-data

# Terminal 2 — Express backend
npm run server

# Terminal 3 — React frontend
npm run client
```

Then open **http://localhost:5173** in your browser.

## Usage

### Chat UI
Open http://localhost:5173 and:
1. **Upload documents** — drag & drop or click to browse (`.txt` and `.pdf`)
2. **Ask questions** — type in the chat input and hit Enter
3. **See sources** — each answer shows which chunks were retrieved and their match score

### CLI mode
```bash
node index.js "What is Artificial Intelligence?"
```

### Switch to production (Anthropic Claude)
```bash
ANTHROPIC_API_KEY=sk-ant-... NODE_ENV=production npm run server
```

## How It Works

```
User Question
      │
      ▼
┌─────────────────────────────────┐
│  Parallel Search                │
│  ├── ChromaDB (your documents)  │
│  └── ChromaDB (Q&A memory)      │
└─────────────────────────────────┘
      │
      ▼
  Merge & rank by similarity score
      │
      ▼
  Inject top chunks into prompt
      │
      ▼
  Stream answer word by word → UI
      │
      ▼
  Auto-save Q&A to memory ♻️
```

## File Upload

Upload documents directly from the browser UI:

| Feature | Detail |
|---|---|
| Drag & drop | Drop files anywhere on the upload zone |
| Click to browse | Click the zone to open file picker |
| Multi-file | Upload up to 10 files at once |
| Auto-index | Files indexed into ChromaDB immediately after upload |
| File types | `.txt` and `.pdf` only |
| Size limit | 10MB per file |
| Success feedback | Green notification + file list after upload |

## Vector Store & Embeddings

Uses **ChromaDB** with **Ollama nomic-embed-text** for semantic search.

### Why ChromaDB?
| Feature | Chroma | Pinecone | Weaviate |
|---|---|---|---|
| Free | ✅ fully | ✅ free tier | ✅ free tier |
| Local | ✅ yes | ❌ cloud only | ⚠️ self-host |
| Setup | simple | API key needed | Docker needed |
| Industry use | ✅ widely used | ✅ widely used | ✅ widely used |

## Q&A Memory

Every question + answer is automatically saved to:
- **ChromaDB** — for fast semantic retrieval
- **`documents/qa-memory.json`** — as a human-readable backup

The more you use it, the smarter it gets.

| Interaction | Effect |
|---|---|
| Ask a question | Q&A saved to memory |
| Ask similar question later | Past answer retrieved as context |
| Restart server | Memory persists from ChromaDB + JSON |

## Smart Chunking

Documents are split by sentences and paragraphs so chunks never cut mid-thought:

- Split on paragraph breaks first
- Then split on sentence boundaries (`.` `!` `?`)
- Overlap of 1 sentence between chunks for context continuity

## Switching Between Providers

| Environment | `NODE_ENV` | Model |
|---|---|---|
| Local dev | unset | Ollama `llama3.2` |
| Production | `production` | Anthropic `claude-sonnet-4-6` |

No code changes needed — just set the environment variable.

## Roadmap

- [x] Load real documents (txt + pdf)
- [x] Smart sentence/paragraph chunking
- [x] Semantic search with embeddings
- [x] ChromaDB vector store (persisted)
- [x] Streaming responses (SSE)
- [x] React chat UI
- [x] Auto-save Q&A memory
- [x] Multi-file upload via UI (drag & drop + click to browse)
- [ ] Conversation history per session
- [ ] Deploy to production with Claude
- [ ] Authentication & multi-user support

## License

MIT