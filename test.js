/* ── Test suite per CodeSnip ──────────────────────────────────── */
const http = require('http');

const BASE = 'http://localhost:4599';
let passed = 0;
let failed = 0;

function assert(condition, msg) {
  if (condition) {
    console.log(`  ✓ ${msg}`);
    passed++;
  } else {
    console.error(`  ✗ ${msg}`);
    failed++;
  }
}

function post(path, body) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const url = new URL(path, BASE);
    const req = http.request(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) },
    }, (res) => {
      let chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(Buffer.concat(chunks).toString()) }); }
        catch { resolve({ status: res.statusCode, body: Buffer.concat(chunks).toString() }); }
      });
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

function get(path) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE);
    http.get(url, (res) => {
      let chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(Buffer.concat(chunks).toString()) }); }
        catch { resolve({ status: res.statusCode, body: Buffer.concat(chunks).toString() }); }
      });
    }).on('error', reject);
  });
}

function delay(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function run() {
  console.log('\n🧪 CodeSnip Test Suite\n');
  console.log('Attendo che il server sia pronto...\n');
  await delay(500);

  // Test 1: Creazione snippet valido
  console.log('─ POST /api/snippets ─');
  const r1 = await post('/api/snippets', { code: 'console.log("hello")', lang: 'javascript' });
  assert(r1.status === 200, 'Creazione snippet: status 200');
  assert(typeof r1.body.id === 'string', 'Creazione snippet: id è una stringa');
  assert(r1.body.id.length === 4, 'Creazione snippet: id lungo 4 caratteri');
  assert(r1.body.expiresIn === '1 ora', 'Creazione snippet: expiresIn corretto');
  const snippetId = r1.body.id;

  // Test 2: Recupero snippet valido
  console.log('\n─ GET /api/snippets/:id ─');
  const r2 = await get(`/api/snippets/${snippetId}`);
  assert(r2.status === 200, 'Recupero snippet: status 200');
  assert(r2.body.code === 'console.log("hello")', 'Recupero snippet: codice corretto');
  assert(r2.body.lang === 'javascript', 'Recupero snippet: linguaggio corretto');

  // Test 3: Recupero snippet inesistente
  console.log('\n─ GET /api/snippets/:id (inesistente) ─');
  const r3 = await get('/api/snippets/zzzz');
  assert(r3.status === 404, 'Snippet inesistente: status 404');
  assert(typeof r3.body.error === 'string', 'Snippet inesistente: messaggio di errore presente');

  // Test 4: Creazione con codice vuoto
  console.log('\n─ POST /api/snippets (codice vuoto) ─');
  const r4 = await post('/api/snippets', { code: '', lang: 'text' });
  assert(r4.status === 400, 'Codice vuoto: status 400');
  const r4b = await post('/api/snippets', { code: '   ', lang: 'text' });
  assert(r4b.status === 400, 'Codice solo spazi: status 400');

  // Test 5: Linguaggio predefinito
  console.log('\n─ POST /api/snippets (senza lang) ─');
  const r5 = await post('/api/snippets', { code: 'SELECT 1' });
  assert(r5.status === 200, 'Senza linguaggio: status 200');
  const r5g = await get(`/api/snippets/${r5.body.id}`);
  assert(r5g.body.lang === 'text', 'Senza linguaggio: lang default è text');

  // Test 6: ID unici
  console.log('\n─ Unicità ID ─');
  const ids = new Set();
  for (let i = 0; i < 10; i++) {
    const r = await post('/api/snippets', { code: `test-${i}` });
    assert(!ids.has(r.body.id), `ID unico: ${r.body.id}`);
    ids.add(r.body.id);
  }

  // Test 7: Limite 50 snippet
  console.log('\n─ Limite 50 snippet ─');
  // Riempiamo fino a 50
  for (let i = 0; i < 50; i++) {
    await post('/api/snippets', { code: `fill-${i}` });
  }
  // Ora creiamone uno nuovo: dovrebbe funzionare (evictOldest rimuove il più vecchio)
  const r7 = await post('/api/snippets', { code: 'after-limit' });
  assert(r7.status === 200, 'Dopo 50 snippet: ancora spazio (evizione funziona)');

  // Test 8: Page HTML servita
  console.log('\n─ Pagina HTML ─');
  const r8 = await get('/');
  assert(r8.status === 200, 'Homepage: status 200');
  assert(typeof r8.body === 'string' && r8.body.includes('<!DOCTYPE'), 'Homepage: HTML valido');

  // Test 9: robots.txt
  console.log('\n─ robots.txt ─');
  const r9 = await get('/robots.txt');
  assert(r9.status === 200, 'robots.txt: status 200');
  assert(r9.body.includes('Disallow: /api/'), 'robots.txt: contiene la regola');

  // Riepilogo
  console.log(`\n${'─'.repeat(40)}`);
  console.log(`  Passati: ${passed}  |  Falliti: ${failed}`);
  console.log(`${'─'.repeat(40)}\n`);

  if (failed > 0) {
    process.exit(1);
  }
}

run().catch(err => {
  console.error('Errore nei test:', err.message);
  process.exit(1);
});
