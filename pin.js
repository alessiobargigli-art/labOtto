(() => {
  'use strict';

  const PIN_KEY = 'lab8.pin';
  const SETUP_KEY = 'lab8.pinSetupDone';
  const MIN_PIN = 4;
  const MAX_PIN = 6;

  const overlay = document.querySelector('#pinOverlay');
  const gameCanvas = document.querySelector('#game');
  const settingsButton = document.querySelector('#pinSettings');
  if (!overlay || !gameCanvas) return;

  const ctx = overlay.getContext('2d');
  ctx.imageSmoothingEnabled = false;

  const access = {
    mode: null,
    input: '',
    firstPin: '',
    message: '',
    messageKind: 'info',
  };

  const KEYS = [
    ['1', '2', '3'],
    ['4', '5', '6'],
    ['7', '8', '9'],
    ['DEL', '0', 'OK'],
  ];

  function storedPin() {
    return localStorage.getItem(PIN_KEY) || '';
  }

  function setupDone() {
    return localStorage.getItem(SETUP_KEY) === '1';
  }

  function pinActive() {
    return /^\d{4,6}$/.test(storedPin());
  }

  function setMessage(text, kind = 'info') {
    access.message = text;
    access.messageKind = kind;
  }

  function setMode(mode, message = '') {
    access.mode = mode;
    access.input = '';
    access.firstPin = mode === 'setup-confirm' ? access.firstPin : '';
    setMessage(message);
    syncOverlay();
  }

  function initialize() {
    if (pinActive()) {
      setMode('unlock', 'INSERISCI IL PIN');
    } else if (!setupDone()) {
      setMode('setup-enter', 'IMPOSTA UN PIN DA 4 A 6 CIFRE');
    } else {
      setMode(null);
    }
  }

  function blocksGameplay() {
    return access.mode !== null;
  }

  function syncOverlay() {
    const active = blocksGameplay();
    overlay.hidden = !active;
    overlay.setAttribute('aria-hidden', active ? 'false' : 'true');
    if (settingsButton) settingsButton.setAttribute('aria-pressed', access.mode === 'settings' ? 'true' : 'false');
    render();
  }

  function maskedInput() {
    return '●'.repeat(access.input.length) + '○'.repeat(Math.max(0, MIN_PIN - access.input.length));
  }

  function titleForMode() {
    switch (access.mode) {
      case 'setup-enter': return 'LAB-8 // NUOVO PIN';
      case 'setup-confirm': return 'LAB-8 // CONFERMA PIN';
      case 'unlock': return 'LAB-8 // BLOCCATO';
      case 'settings': return 'LAB-8 // IMPOSTAZIONI PIN';
      case 'disable-confirm': return 'LAB-8 // DISATTIVA PIN';
      case 'enable-enter': return 'LAB-8 // ATTIVA PIN';
      case 'enable-confirm': return 'LAB-8 // CONFERMA PIN';
      default: return 'LAB-8';
    }
  }

  function subtitleForMode() {
    switch (access.mode) {
      case 'setup-enter': return '4-6 CIFRE // SOLO SU QUESTO DISPOSITIVO';
      case 'setup-confirm': return 'RIDIGITA LO STESSO PIN';
      case 'unlock': return 'SBLOCCA PER INIZIARE';
      case 'disable-confirm': return 'INSERISCI IL PIN CORRENTE';
      case 'enable-enter': return 'SCEGLI UN PIN DA 4 A 6 CIFRE';
      case 'enable-confirm': return 'RIDIGITA LO STESSO PIN';
      default: return pinActive() ? 'PIN ATTIVO SU QUESTO DISPOSITIVO' : 'PIN NON ATTIVO';
    }
  }

  function palette() {
    return { bg: '#08131a', panel: '#10252b', ink: '#e6ffcf', muted: '#74b49b', accent: '#f6c85f', danger: '#ff6b6b' };
  }

  function rect(x, y, w, h, color) {
    ctx.fillStyle = color;
    ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
  }

  function text(value, x, y, size, color, align = 'center') {
    ctx.fillStyle = color;
    ctx.font = `bold ${size}px monospace`;
    ctx.textAlign = align;
    ctx.textBaseline = 'middle';
    ctx.fillText(value, x, y);
  }

  function keypadGeometry() {
    const keyW = 82;
    const keyH = 38;
    const gap = 10;
    const totalW = keyW * 3 + gap * 2;
    const startX = (overlay.width - totalW) / 2;
    const startY = 142;
    return { keyW, keyH, gap, startX, startY };
  }

  function actionRects() {
    return {
      skip: { x: 42, y: 98, w: 180, h: 30 },
      close: { x: 42, y: 304, w: 180, h: 34 },
      primary: { x: 738, y: 304, w: 180, h: 34 },
    };
  }

  function drawButton(box, label, color, p) {
    rect(box.x, box.y, box.w, box.h, p.bg);
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.strokeRect(box.x + 1.5, box.y + 1.5, box.w - 3, box.h - 3);
    text(label, box.x + box.w / 2, box.y + box.h / 2 + 1, 14, color);
  }

  function renderKeypad(p) {
    const g = keypadGeometry();
    for (let row = 0; row < KEYS.length; row++) {
      for (let col = 0; col < KEYS[row].length; col++) {
        const label = KEYS[row][col];
        const x = g.startX + col * (g.keyW + g.gap);
        const y = g.startY + row * (g.keyH + g.gap);
        rect(x, y, g.keyW, g.keyH, p.panel);
        ctx.strokeStyle = label === 'OK' ? p.accent : p.ink;
        ctx.lineWidth = 3;
        ctx.strokeRect(x + 1.5, y + 1.5, g.keyW - 3, g.keyH - 3);
        text(label, x + g.keyW / 2, y + g.keyH / 2 + 1, label.length > 1 ? 14 : 20, label === 'OK' ? p.accent : p.ink);
      }
    }
  }

  function renderSettings(p) {
    const actions = actionRects();
    const primaryLabel = pinActive() ? 'DISATTIVA PIN' : 'ATTIVA PIN';
    drawButton(actions.close, 'CHIUDI', p.muted, p);
    drawButton(actions.primary, primaryLabel, pinActive() ? p.danger : p.accent, p);
  }

  function render() {
    if (!blocksGameplay()) return;
    const p = palette();
    ctx.clearRect(0, 0, overlay.width, overlay.height);
    rect(0, 0, overlay.width, overlay.height, p.bg);

    ctx.globalAlpha = 0.12;
    for (let y = 0; y < overlay.height; y += 12) rect(0, y, overlay.width, 3, p.muted);
    ctx.globalAlpha = 1;

    rect(22, 18, overlay.width - 44, overlay.height - 36, p.panel);
    ctx.strokeStyle = p.ink;
    ctx.lineWidth = 4;
    ctx.strokeRect(24, 20, overlay.width - 48, overlay.height - 40);

    text(titleForMode(), overlay.width / 2, 50, 25, p.ink);
    text(subtitleForMode(), overlay.width / 2, 84, 14, p.muted);

    if (access.mode === 'settings') {
      text(pinActive() ? '● PIN ATTIVO' : '○ PIN DISATTIVATO', overlay.width / 2, 164, 25, pinActive() ? p.accent : p.muted);
      text('IL PIN RESTA SOLO NEL BROWSER DI QUESTO DISPOSITIVO', overlay.width / 2, 214, 13, p.ink);
      renderSettings(p);
      return;
    }

    text(maskedInput(), overlay.width / 2, 116, 22, p.accent);
    renderKeypad(p);

    if (access.message) {
      text(access.message, overlay.width / 2, 334, 13, access.messageKind === 'error' ? p.danger : p.muted);
    }

    const actions = actionRects();
    if (access.mode === 'setup-enter') drawButton(actions.skip, 'SALTA // NO PIN', p.muted, p);
  }

  function addDigit(digit) {
    if (!/^\d$/.test(digit) || access.input.length >= MAX_PIN) return;
    access.input += digit;
    setMessage('');
    render();
  }

  function removeDigit() {
    access.input = access.input.slice(0, -1);
    setMessage('');
    render();
  }

  function savePin(pin) {
    localStorage.setItem(PIN_KEY, pin);
    localStorage.setItem(SETUP_KEY, '1');
  }

  function submit() {
    if (access.input.length < MIN_PIN || access.input.length > MAX_PIN) {
      setMessage('IL PIN DEVE AVERE DA 4 A 6 CIFRE', 'error');
      render();
      return;
    }

    if (access.mode === 'setup-enter' || access.mode === 'enable-enter') {
      access.firstPin = access.input;
      access.input = '';
      access.mode = access.mode === 'setup-enter' ? 'setup-confirm' : 'enable-confirm';
      setMessage('CONFERMA IL PIN');
      render();
      return;
    }

    if (access.mode === 'setup-confirm' || access.mode === 'enable-confirm') {
      if (access.input !== access.firstPin) {
        const backTo = access.mode === 'setup-confirm' ? 'setup-enter' : 'enable-enter';
        access.input = '';
        access.firstPin = '';
        access.mode = backTo;
        setMessage('I PIN NON COINCIDONO // RIPROVA', 'error');
        render();
        return;
      }
      savePin(access.input);
      setMode(null);
      gameCanvas.focus({preventScroll:true});
      return;
    }

    if (access.mode === 'unlock') {
      if (access.input === storedPin()) {
        setMode(null);
        gameCanvas.focus({preventScroll:true});
      } else {
        access.input = '';
        setMessage('PIN ERRATO', 'error');
        render();
      }
      return;
    }

    if (access.mode === 'disable-confirm') {
      if (access.input === storedPin()) {
        localStorage.removeItem(PIN_KEY);
        localStorage.setItem(SETUP_KEY, '1');
        access.mode = 'settings';
        access.input = '';
        setMessage('PIN DISATTIVATO');
        render();
      } else {
        access.input = '';
        setMessage('PIN CORRENTE ERRATO', 'error');
        render();
      }
    }
  }

  function skipInitialSetup() {
    if (access.mode !== 'setup-enter') return;
    localStorage.removeItem(PIN_KEY);
    localStorage.setItem(SETUP_KEY, '1');
    setMode(null);
    gameCanvas.focus({preventScroll:true});
  }

  function openSettings() {
    if (access.mode === 'unlock' || access.mode?.startsWith('setup')) return;
    setMode('settings');
  }

  function closeSettings() {
    if (!['settings', 'disable-confirm', 'enable-enter', 'enable-confirm'].includes(access.mode)) return;
    setMode(null);
    gameCanvas.focus({preventScroll:true});
  }

  function settingsPrimaryAction() {
    if (access.mode !== 'settings') return;
    if (pinActive()) setMode('disable-confirm', 'INSERISCI IL PIN CORRENTE');
    else setMode('enable-enter', 'SCEGLI UN NUOVO PIN');
  }

  function hitTest(x, y) {
    if (access.mode === 'settings') {
      const actions = actionRects();
      if (inside(x, y, actions.close)) return 'CLOSE';
      if (inside(x, y, actions.primary)) return 'PRIMARY';
      return null;
    }

    const g = keypadGeometry();
    for (let row = 0; row < KEYS.length; row++) {
      for (let col = 0; col < KEYS[row].length; col++) {
        const box = { x: g.startX + col * (g.keyW + g.gap), y: g.startY + row * (g.keyH + g.gap), w: g.keyW, h: g.keyH };
        if (inside(x, y, box)) return KEYS[row][col];
      }
    }
    const actions = actionRects();
    if (access.mode === 'setup-enter' && inside(x, y, actions.skip)) return 'SKIP';
    return null;
  }

  function inside(x, y, box) {
    return x >= box.x && x <= box.x + box.w && y >= box.y && y <= box.y + box.h;
  }

  function activateKey(key) {
    if (!key) return;
    if (/^\d$/.test(key)) addDigit(key);
    else if (key === 'DEL') removeDigit();
    else if (key === 'OK') submit();
    else if (key === 'SKIP') skipInitialSetup();
    else if (key === 'CLOSE') closeSettings();
    else if (key === 'PRIMARY') settingsPrimaryAction();
  }

  overlay.addEventListener('pointerdown', (event) => {
    if (!blocksGameplay()) return;
    event.preventDefault();
    event.stopPropagation();
    const bounds = overlay.getBoundingClientRect();
    const x = (event.clientX - bounds.left) * (overlay.width / bounds.width);
    const y = (event.clientY - bounds.top) * (overlay.height / bounds.height);
    activateKey(hitTest(x, y));
  });

  window.addEventListener('keydown', (event) => {
    if (!blocksGameplay()) return;
    const key = event.key;
    if (/^\d$/.test(key)) {
      event.preventDefault();
      event.stopImmediatePropagation();
      addDigit(key);
    } else if (key === 'Backspace' || key === 'Delete') {
      event.preventDefault();
      event.stopImmediatePropagation();
      removeDigit();
    } else if (key === 'Enter') {
      event.preventDefault();
      event.stopImmediatePropagation();
      if (access.mode === 'settings') settingsPrimaryAction();
      else submit();
    } else if (key === 'Escape' && ['settings', 'disable-confirm', 'enable-enter', 'enable-confirm'].includes(access.mode)) {
      event.preventDefault();
      event.stopImmediatePropagation();
      closeSettings();
    } else {
      event.preventDefault();
      event.stopImmediatePropagation();
    }
  }, true);

  settingsButton?.addEventListener('click', (event) => {
    event.preventDefault();
    if (access.mode === 'settings') closeSettings();
    else openSettings();
  });

  window.Lab8Pin = {
    blocksGameplay,
    isPinActive: pinActive,
    openSettings,
    _test: {
      access,
      initialize,
      activateKey,
      submit,
      skipInitialSetup,
      settingsPrimaryAction,
      closeSettings,
      storedPin,
    },
  };

  initialize();
})();
