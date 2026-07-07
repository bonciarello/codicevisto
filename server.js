const express = require('express');
const path = require('path');

const app = express();
app.use(express.json({ limit: '512kb' }));
app.use(express.static(path.join(__dirname, 'public')));

/* ── Snippet store ─────────────────────────────────────────────── */
const snippets = new Map();          // id -> { code, lang, createdAt }
const MAX_SNIPPETS = 50;
const TTL_MS = 3_600_000;           // 1 ora
const ID_CHARS = 'abcdefghijklmnopqrstuvwxyz0123456789';
const ID_LEN = 4;

function generateId() {
  let id;
  do {
    id = '';
    for (let i = 0; i < ID_LEN; i++) {
      id += ID_CHARS[Math.floor(Math.random() * ID_CHARS.length)];
    }
  } while (snippets.has(id));
  return id;
}

function purgeExpired() {
  const now = Date.now();
  for (const [id, s] of snippets) {
    if (now - s.createdAt > TTL_MS) snippets.delete(id);
  }
}

function evictOldest() {
  let oldestId = null;
  let oldestTs = Infinity;
  for (const [id, s] of snippets) {
    if (s.createdAt < oldestTs) { oldestTs = s.createdAt; oldestId = id; }
  }
  if (oldestId) snippets.delete(oldestId);
}

setInterval(purgeExpired, 60_000);

/* ── API ────────────────────────────────────────────────────────── */
// POST /api/snippets — crea un nuovo snippet
app.post('/api/snippets', (req, res) => {
  const { code, lang } = req.body;
  if (!code || typeof code !== 'string' || code.trim().length === 0) {
    return res.status(400).json({ error: 'Il codice non può essere vuoto.' });
  }

  purgeExpired();

  if (snippets.size >= MAX_SNIPPETS) evictOldest();

  const id = generateId();
  snippets.set(id, {
    code: code.trim(),
    lang: (lang && typeof lang === 'string') ? lang : 'text',
    createdAt: Date.now()
  });

  res.json({ id, expiresIn: '1 ora' });
});

// GET /api/snippets/:id — recupera uno snippet
app.get('/api/snippets/:id', (req, res) => {
  const { id } = req.params;
  purgeExpired();

  const snippet = snippets.get(id);
  if (!snippet) {
    return res.status(404).json({ error: 'Snippet non trovato. Potrebbe essere scaduto o l\'ID non è corretto.' });
  }

  res.json({ code: snippet.code, lang: snippet.lang, createdAt: snippet.createdAt });
});

// Servire index.html per qualsiasi altra rotta (SPA)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 4599;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`CodeSnip server attivo su http://0.0.0.0:${PORT}`);
});
