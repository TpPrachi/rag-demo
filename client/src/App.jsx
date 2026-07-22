import React, { useState, useRef, useEffect, useCallback } from 'react';

// ── Upload Zone Component ─────────────────────────────────────────
function UploadZone({ onUpload }) {
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const inputRef = useRef(null);

  const handleFiles = useCallback(async (files) => {
    if (!files.length) return;
    setUploading(true);

    const formData = new FormData();
    Array.from(files).forEach(f => formData.append('files', f));

    try {
      const res = await fetch('http://localhost:3001/api/upload', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (data.success) {
        setUploadedFiles(prev => [...prev, ...data.files.map(f => f.name)]);
        onUpload(data.files);
      }
    } catch (err) {
      console.error('Upload failed:', err);
    } finally {
      setUploading(false);
    }
  }, [onUpload]);

  const onDrop = useCallback((e) => {
    e.preventDefault();
    setDragging(false);
    handleFiles(e.dataTransfer.files);
  }, [handleFiles]);

  const onDragOver = (e) => { e.preventDefault(); setDragging(true); };
  const onDragLeave = () => setDragging(false);

  return (
    <div style={{ padding: '12px 16px', borderBottom: '1px solid #222' }}>
      {/* Drop zone */}
      <div
        onClick={() => inputRef.current?.click()}
        onDrop={onDrop}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        style={{
          border: `2px dashed ${dragging ? '#2563eb' : '#333'}`,
          borderRadius: '10px',
          padding: '16px',
          textAlign: 'center',
          cursor: 'pointer',
          background: dragging ? '#1a1a3e' : 'transparent',
          transition: 'all 0.2s',
        }}
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          accept=".txt,.pdf"
          style={{ display: 'none' }}
          onChange={e => handleFiles(e.target.files)}
        />
        {uploading ? (
          <div style={{ color: '#2563eb', fontSize: '13px' }}>⏳ Uploading & indexing...</div>
        ) : (
          <>
            <div style={{ fontSize: '24px' }}>📁</div>
            <div style={{ fontSize: '13px', color: '#888', marginTop: '4px' }}>
              Drag & drop or <span style={{ color: '#2563eb' }}>browse</span> · .txt and .pdf
            </div>
          </>
        )}
      </div>

      {/* Uploaded files list */}
      {uploadedFiles.length > 0 && (
        <div style={{ marginTop: '8px' }}>
          {uploadedFiles.map((f, i) => (
            <div key={i} style={{
              fontSize: '12px',
              color: '#4ade80',
              padding: '2px 0',
            }}>
              ✅ {f}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Message Component ─────────────────────────────────────────────
function Message({ role, text, sources, streaming }) {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: role === 'user' ? 'flex-end' : 'flex-start',
      marginBottom: '16px',
    }}>
      <div style={{
        maxWidth: '70%',
        padding: '12px 16px',
        borderRadius: role === 'user' ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
        background: role === 'user' ? '#2563eb' : '#1e1e2e',
        color: '#fff',
        fontSize: '15px',
        lineHeight: '1.6',
        whiteSpace: 'pre-wrap',
      }}>
        {text}
        {streaming && <span style={{ opacity: 0.5 }}>▌</span>}
      </div>

      {sources && sources.length > 0 && (
        <div style={{ maxWidth: '70%', marginTop: '6px' }}>
          <div style={{ fontSize: '11px', color: '#666', marginBottom: '4px' }}>Sources:</div>
          {sources.map((s, i) => (
            <div key={i} style={{
              fontSize: '11px',
              color: '#888',
              background: '#111',
              borderRadius: '6px',
              padding: '4px 8px',
              marginBottom: '2px',
            }}>
              {s.doc.slice(0, 80)}...
              <span style={{ color: '#2563eb' }}> ({(s.score * 100).toFixed(0)}% match)</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main App ──────────────────────────────────────────────────────
export default function App() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [notification, setNotification] = useState(null);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  function handleUpload(files) {
    setNotification(`✅ ${files.length} file(s) uploaded and indexed!`);
    setTimeout(() => setNotification(null), 3000);
  }

  async function ask(e) {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const question = input.trim();
    setInput('');
    setLoading(true);

    setMessages(prev => [...prev, { role: 'user', text: question }]);

    const assistantId = Date.now();
    setMessages(prev => [...prev, { id: assistantId, role: 'assistant', text: '', streaming: true }]);

    const es = new EventSource(`http://localhost:3001/api/ask?q=${encodeURIComponent(question)}`);

    es.addEventListener('sources', (e) => {
      const { sources } = JSON.parse(e.data);
      setMessages(prev => prev.map(m => m.id === assistantId ? { ...m, sources } : m));
    });

    es.addEventListener('chunk', (e) => {
      const { text } = JSON.parse(e.data);
      setMessages(prev => prev.map(m =>
        m.id === assistantId ? { ...m, text: m.text + text } : m
      ));
    });

    es.addEventListener('done', () => {
      es.close();
      setLoading(false);
      setMessages(prev => prev.map(m =>
        m.id === assistantId ? { ...m, streaming: false } : m
      ));
    });

    es.addEventListener('error', () => {
      es.close();
      setLoading(false);
    });
  }

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
      background: '#0a0a0f',
      color: '#fff',
      fontFamily: 'system-ui, sans-serif',
    }}>
      {/* Header */}
      <div style={{
        padding: '16px 24px',
        borderBottom: '1px solid #222',
        fontSize: '18px',
        fontWeight: '600',
      }}>
        🔍 RAG Demo
        <span style={{ fontSize: '12px', color: '#666', marginLeft: '8px' }}>
          powered by Ollama + ChromaDB
        </span>
      </div>

      {/* Upload Zone */}
      <UploadZone onUpload={handleUpload} />

      {/* Notification */}
      {notification && (
        <div style={{
          background: '#14532d',
          color: '#4ade80',
          padding: '8px 24px',
          fontSize: '13px',
          textAlign: 'center',
        }}>
          {notification}
        </div>
      )}

      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
        {messages.length === 0 && (
          <div style={{ textAlign: 'center', color: '#444', marginTop: '60px' }}>
            <div style={{ fontSize: '48px' }}>🤖</div>
            <div style={{ marginTop: '12px' }}>Upload documents then ask questions</div>
          </div>
        )}
        {messages.map((m, i) => <Message key={i} {...m} />)}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <form onSubmit={ask} style={{
        display: 'flex',
        gap: '8px',
        padding: '16px 24px',
        borderTop: '1px solid #222',
      }}>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="Ask a question about your documents..."
          disabled={loading}
          style={{
            flex: 1,
            padding: '12px 16px',
            borderRadius: '12px',
            border: '1px solid #333',
            background: '#1a1a2e',
            color: '#fff',
            fontSize: '15px',
            outline: 'none',
          }}
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          style={{
            padding: '12px 20px',
            borderRadius: '12px',
            border: 'none',
            background: loading ? '#333' : '#2563eb',
            color: '#fff',
            fontSize: '15px',
            cursor: loading ? 'not-allowed' : 'pointer',
          }}
        >
          {loading ? '...' : '→'}
        </button>
      </form>
    </div>
  );
}