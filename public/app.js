/* ── DOM references ─────────────────────────────────────────────── */
const shareForm   = document.getElementById('share-form');
const codeInput   = document.getElementById('code-input');
const codeError   = document.getElementById('code-error');
const shareBtn    = document.getElementById('share-btn');
const shareResult = document.getElementById('share-result');
const resultIdDisp= document.getElementById('result-id-display');
const copyIdBtn   = document.getElementById('copy-id-btn');

const viewForm    = document.getElementById('view-form');
const viewIdInput = document.getElementById('view-id-input');
const viewIdError = document.getElementById('view-id-error');
const viewBtn     = document.getElementById('view-btn');
const viewResult  = document.getElementById('view-result');
const codeContent = document.getElementById('code-content');
const codeLangLbl = document.getElementById('code-lang-label');
const copyCodeBtn = document.getElementById('copy-code-btn');
const viewError   = document.getElementById('view-error');

/* ── Utilities ──────────────────────────────────────────────────── */
function show(el) { el.hidden = false; }
function hide(el) { el.hidden = true; }

function setError(el, msg) {
  el.textContent = msg || '';
}

function markFieldError(input, errorEl, msg) {
  input.classList.add('error');
  setError(errorEl, msg);
}

function clearFieldError(input, errorEl) {
  input.classList.remove('error');
  setError(errorEl, '');
}

function langLabel(lang) {
  const map = {
    javascript: 'JavaScript', typescript: 'TypeScript', python: 'Python',
    html: 'HTML', css: 'CSS', json: 'JSON', bash: 'Bash',
    sql: 'SQL', markdown: 'Markdown', yaml: 'YAML', java: 'Java',
    c: 'C', cpp: 'C++', ruby: 'Ruby', go: 'Go', rust: 'Rust',
    php: 'PHP', text: 'Testo'
  };
  return map[lang] || lang;
}

async function apiPost(body) {
  const res = await fetch('api/snippets', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Errore del server');
  return data;
}

async function apiGet(id) {
  const res = await fetch(`api/snippets/${encodeURIComponent(id)}`);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Snippet non trovato');
  return data;
}

async function copyToClipboard(text) {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    await navigator.clipboard.writeText(text);
  } else {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
  }
}

function showCopyFeedback(btn, label) {
  const origHTML = btn.innerHTML;
  btn.innerHTML = `
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M3 8L6.5 11.5L13 5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>
    Copiato!
  `;
  btn.classList.add('copied');
  setTimeout(() => {
    btn.innerHTML = origHTML;
    btn.classList.remove('copied');
  }, 2000);
}

/* ── Share handler ──────────────────────────────────────────────── */
shareForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  hide(shareResult);
  hide(viewResult);
  hide(viewError);

  const code = codeInput.value;
  clearFieldError(codeInput, codeError);

  if (!code || code.trim().length === 0) {
    markFieldError(codeInput, codeError, 'Inserisci il codice da condividere.');
    codeInput.focus();
    return;
  }

  if (code.trim().length > 500000) {
    markFieldError(codeInput, codeError, 'Il codice è troppo lungo (massimo 500.000 caratteri).');
    return;
  }

  shareBtn.disabled = true;
  shareBtn.textContent = 'Invio in corso…';

  try {
    const lang = document.getElementById('lang-select').value;
    const data = await apiPost({ code, lang });
    resultIdDisp.textContent = data.id;
    show(shareResult);
    codeInput.value = '';
    document.getElementById('lang-select').value = 'text';
    resultIdDisp.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  } catch (err) {
    markFieldError(codeInput, codeError, err.message || 'Errore durante la condivisione. Riprova.');
  } finally {
    shareBtn.disabled = false;
    shareBtn.innerHTML = `
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
        <path d="M4 10L16 10M16 10L11 5M16 10L11 15" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
      Invia snippet
    `;
  }
});

/* ── Blur validation share ──────────────────────────────────────── */
codeInput.addEventListener('blur', () => {
  if (codeInput.value.trim().length === 0) {
    markFieldError(codeInput, codeError, 'Inserisci il codice da condividere.');
  } else {
    clearFieldError(codeInput, codeError);
  }
});

codeInput.addEventListener('input', () => {
  if (codeInput.value.trim().length > 0) {
    clearFieldError(codeInput, codeError);
  }
});

/* ── Copy ID ────────────────────────────────────────────────────── */
copyIdBtn.addEventListener('click', async () => {
  try {
    await copyToClipboard(resultIdDisp.textContent);
    showCopyFeedback(copyIdBtn);
  } catch {
    // silently fail
  }
});

/* ── View handler ───────────────────────────────────────────────── */
viewForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  hide(viewResult);
  hide(viewError);
  clearFieldError(viewIdInput, viewIdError);

  const id = viewIdInput.value.trim().toLowerCase();

  if (!id || id.length !== 4 || !/^[a-z0-9]{4}$/.test(id)) {
    markFieldError(viewIdInput, viewIdError, 'L\'ID deve essere di 4 caratteri (lettere e numeri).');
    viewIdInput.focus();
    return;
  }

  viewBtn.disabled = true;
  viewBtn.textContent = 'Caricamento…';

  try {
    const data = await apiGet(id);

    // Update display
    codeLangLbl.textContent = langLabel(data.lang);

    // Set code content
    codeContent.textContent = data.code;
    codeContent.className = `language-${data.lang}`;

    // Highlight
    if (window.Prism) {
      Prism.highlightElement(codeContent);
    }

    show(viewResult);
    viewResult.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  } catch (err) {
    hide(viewResult);
    viewError.textContent = err.message || 'Snippet non trovato o scaduto.';
    show(viewError);
  } finally {
    viewBtn.disabled = false;
    viewBtn.innerHTML = `
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
        <circle cx="9" cy="9" r="5" stroke="currentColor" stroke-width="2"/>
        <path d="M13 13L17 17" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
      </svg>
      Visualizza
    `;
  }
});

/* ── Blur validation view ──────────────────────────────────────── */
viewIdInput.addEventListener('blur', () => {
  const val = viewIdInput.value.trim().toLowerCase();
  if (val && (val.length !== 4 || !/^[a-z0-9]{4}$/.test(val))) {
    markFieldError(viewIdInput, viewIdError, 'L\'ID deve essere di 4 caratteri (lettere e numeri).');
  } else {
    clearFieldError(viewIdInput, viewIdError);
  }
});

viewIdInput.addEventListener('input', () => {
  const val = viewIdInput.value.trim().toLowerCase();
  if (!val || (val.length === 4 && /^[a-z0-9]{4}$/.test(val))) {
    clearFieldError(viewIdInput, viewIdError);
  }
});

/* ── Copy code ──────────────────────────────────────────────────── */
copyCodeBtn.addEventListener('click', async () => {
  try {
    await copyToClipboard(codeContent.textContent);
    showCopyFeedback(copyCodeBtn);
  } catch {
    // silently fail
  }
});

/* ── Auto-focus ─────────────────────────────────────────────────── */
// Let the textarea be the primary interaction point
codeInput.focus();
