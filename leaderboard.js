(() => {
  'use strict';
  const overlay = document.querySelector('#leaderboardOverlay');
  const list = document.querySelector('#leaderboardList');
  const status = document.querySelector('#leaderboardStatus');
  const openButton = document.querySelector('#leaderboardButton');
  const closeButton = document.querySelector('#leaderboardClose');
  const toast = document.querySelector('#leaderboardToast');
  if (!overlay) return;

  if (overlay.parentElement !== document.body) document.body.appendChild(overlay);

  let open = false;
  let submittedGameToken = null;

  function bindPress(element, handler) {
    if (!element) return;
    let pointerHandledAt = 0;
    element.addEventListener('pointerup', (event) => {
      if (event.pointerType === 'mouse' && event.button !== 0) return;
      pointerHandledAt = performance.now();
      event.preventDefault();
      event.stopPropagation();
      handler(event);
    });
    element.addEventListener('click', (event) => {
      if (performance.now() - pointerHandledAt < 500) return;
      event.preventDefault();
      event.stopPropagation();
      handler(event);
    });
  }

  overlay.addEventListener('pointerdown', (event) => event.stopPropagation(), true);
  overlay.addEventListener('pointerup', (event) => event.stopPropagation(), true);

  function blocksGameplay() { return open; }
  function formatDate(value) {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? '--' : date.toLocaleString('it-IT', { dateStyle: 'short', timeStyle: 'short' });
  }
  function renderRows(rows) {
    list.innerHTML = '';
    rows.forEach((row, index) => {
      const item = document.createElement('div');
      item.className = `leaderboard-row rank-${index + 1}`;
      item.innerHTML = `<span>${String(index + 1).padStart(2, '0')}</span><strong></strong><span>${row.score}</span><time></time>`;
      item.querySelector('strong').textContent = row.name;
      item.querySelector('time').textContent = formatDate(row.occurredAt);
      list.appendChild(item);
    });
    if (!rows.length) list.innerHTML = '<div class="leaderboard-empty">NESSUN RECORD</div>';
  }
  async function load() {
    status.textContent = 'CARICO CLASSIFICA...';
    try {
      const response = await fetch('./api/leaderboard', { cache: 'no-store' });
      if (!response.ok) throw new Error('service unavailable');
      const data = await response.json();
      renderRows(data.leaderboard || []);
      status.textContent = 'TOP 15 GLOBALE';
      return data.leaderboard || [];
    } catch {
      renderRows([]);
      status.textContent = 'CLASSIFICA GLOBALE NON DISPONIBILE SU DEPLOY STATICO';
      return null;
    }
  }
  async function show() {
    open = true;
    overlay.hidden = false;
    overlay.scrollTop = 0;
    await load();
  }
  function hide() {
    open = false;
    overlay.hidden = true;
    document.querySelector('#game')?.focus();
  }
  function showToast(text) {
    toast.textContent = text;
    toast.hidden = false;
    clearTimeout(showToast.timer);
    showToast.timer = setTimeout(() => { toast.hidden = true; }, 4200);
  }
  async function recordScore(score, token) {
    if (token != null && token === submittedGameToken) return null;
    submittedGameToken = token;
    const name = globalThis.Lab8Settings?.playerName?.() || 'GUIDO';
    try {
      const response = await fetch('./api/leaderboard', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ name, score: Math.max(0, Math.floor(score)) })
      });
      if (!response.ok) throw new Error('service unavailable');
      const result = await response.json();
      if (result.qualified) showToast(`TOP 15! ${name} // POSIZIONE ${result.rank}`);
      return result;
    } catch {
      return null;
    }
  }

  bindPress(openButton, show);
  bindPress(closeButton, hide);
  globalThis.Lab8Leaderboard = { blocksGameplay, show, close: hide, load, recordScore, _test: { renderRows } };
})();
