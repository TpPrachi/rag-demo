# RAG Demo with Node.js

A Retrieval-Augmented Generation (RAG) application built with Node.js that works locally using Ollama and can be switched to Anthropic Claude for production.

## What is RAG?

RAG combines a retrieval system with a Large Language Model (LLM). Instead of relying on the model's training data, it:
1. **Retrieves** relevant chunks from your documents
2. **Augments** the prompt with that context
3. **Generates** an answer grounded in your documents

## Features

- 📄 Load real documents (`.txt` and `.pdf`)
- 🔍 TF-IDF based retrieval
- 🦙 Local inference with Ollama (free, offline)
- ☁️ Switch to Anthropic Claude for production
- 📦 Auto chunking of large documents

## Project Structure

rag-demo/

├── index.js          # Main RAG pipeline

├── vectorStore.js    # TF-IDF retrieval

├── loader.js         # Document loader (txt + pdf)

├── documents/        # Drop your files here

└── package.json

## Prerequisites

- Node.js v18+
- [Ollama](https://ollama.com) installed locally

## Setup

### 1. Clone the repo
```bash
git clone https://github.com/TpPrachi/rag-demo.git
cd rag-demo
```

### 2. Install dependencies
```bash
npm install
```

### 3. Install Ollama & pull a model
```bash
# Linux
curl -fsSL https://ollama.com/install.sh | sh

# Pull the model
ollama pull llama3.2
```

### 4. Add your documents
Drop any `.txt` or `.pdf` files into the `documents/` folder.

## Usage

### Run locally (free, uses Ollama)
```bash
node index.js "Your question here"
```

### Run in production (uses Anthropic Claude)
```bash
ANTHROPIC_API_KEY=sk-ant-... NODE_ENV=production node index.js "Your question here"
```

## Switching Between Providers

| Environment | `NODE_ENV` | Model |
|---|---|---|
| Local dev | unset | Ollama llama3.2 |
| Production | `production` | Anthropic claude-sonnet-4-6 |

No code changes needed — just set the environment variable.

## How It Works

Your Question

│

▼

┌─────────────┐

│   Retrieve  │  ← TF-IDF cosine similarity search

│  top K docs │

└─────────────┘

│

▼

┌─────────────┐

│   Augment   │  ← Inject chunks into system prompt

│   prompt    │

└─────────────┘

│

▼

┌─────────────┐

│  Generate   │  ← Ollama or Claude answers

│   answer    │

└─────────────┘

## Next Steps

- [ ] Semantic search with embeddings
- [ ] Streaming responses
- [ ] Persistent vector store
- [ ] Support more file types (docx, csv)
