(() => {
  'use strict';
  const NAME_KEY = 'lab8.playerName';
  const SPEED_KEY = 'lab8.initialSpeedIndex';
  const overlay = document.querySelector('#settingsOverlay');
  const openButton = document.querySelector('#settingsButton');
  const closeButton = document.querySelector('#settingsClose');
  const saveButton = document.querySelector('#settingsSave');
  const nameInput = document.querySelector('#playerName');
  const pinStatus = document.querySelector('#settingsPinStatus');
  const pinAction = document.querySelector('#settingsPinAction');
  const speedButtons = [...document.querySelectorAll('[data-start-speed]')];
  if (!overlay) return;

  if (overlay.parentElement !== document.body) document.body.appendChild(overlay);

  let open = false;
  let selectedSpeed = 1;

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

  function playerName() { return (localStorage.getItem(NAME_KEY) || 'GUIDO').trim().slice(0, 20) || 'GUIDO'; }
  function initialSpeedIndex() {
    const raw = localStorage.getItem(SPEED_KEY);
    if (raw === null) return 1;
    const value = Number(raw);
    return Number.isInteger(value) && value >= 0 && value <= 2 ? value : 1;
  }
  function refreshPin() {
    const active = !!globalThis.Lab8Pin?.isPinActive?.();
    if (pinStatus) pinStatus.textContent = active ? 'PIN ATTIVO' : 'PIN DISATTIVATO';
    if (pinAction) pinAction.textContent = active ? 'DISATTIVA PIN' : 'ATTIVA PIN';
  }
  function refreshSpeed() {
    speedButtons.forEach((button) => button.classList.toggle('is-selected', Number(button.dataset.startSpeed) === selectedSpeed));
  }
  function show() {
    if (globalThis.Lab8Pin?.blocksGameplay?.()) return;
    open = true;
    selectedSpeed = initialSpeedIndex();
    nameInput.value = playerName();
    refreshSpeed();
    refreshPin();
    overlay.hidden = false;
    overlay.scrollTop = 0;
    requestAnimationFrame(() => nameInput.focus({ preventScroll: true }));
  }
  function hide() {
    open = false;
    overlay.hidden = true;
    document.querySelector('#game')?.focus();
  }
  function save() {
    const name = nameInput.value.trim().slice(0, 20) || 'GUIDO';
    localStorage.setItem(NAME_KEY, name);
    localStorage.setItem(SPEED_KEY, String(selectedSpeed));
    globalThis.Lab8Game?.applyInitialSpeed?.(selectedSpeed);
    hide();
  }
  function managePin() {
    hide();
    globalThis.Lab8Pin?.openSettings?.();
  }

  speedButtons.forEach((button) => bindPress(button, () => {
    selectedSpeed = Number(button.dataset.startSpeed);
    refreshSpeed();
  }));
  bindPress(openButton, show);
  bindPress(closeButton, hide);
  bindPress(saveButton, save);
  bindPress(pinAction, managePin);

  globalThis.Lab8Settings = {
    blocksGameplay: () => open,
    playerName,
    initialSpeedIndex,
    open: show,
    close: hide,
    _test: {
      save,
      setSpeed: (v) => { selectedSpeed = v; },
      get selectedSpeed() { return selectedSpeed; }
    }
  };
})();
