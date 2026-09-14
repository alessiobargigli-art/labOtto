(() => {
  'use strict';

  const game = globalThis.Lab8Game?._test;
  if (!game?.state || !game?.guido || !game?.level) return;

  const state = game.state;
  const guido = game.guido;
  const INHALE_RANGE = 250;
  const BOMB_SIZE = 30;
  const FLOOR_Y = 302;
  const GRAVITY = 1500;
  const BOUNCE_VY = -510;
  const MIN_SPAWN_SECONDS = 5.5;
  const MAX_SPAWN_SECONDS = 8.5;

  let spawnTimer = randomSpawnDelay();
  let last = performance.now();

  function randomSpawnDelay() {
    return MIN_SPAWN_SECONDS + Math.random() * (MAX_SPAWN_SECONDS - MIN_SPAWN_SECONDS);
  }

  function isBomb(hazard) {
    return hazard?.type === 'bomb';
  }

  function canSpawnBomb() {
    if (!state.running || state.mode !== 'RUNNER' || state.transition > 0) return false;
    if (state.hazards.some(isBomb)) return false;
    if (state.hazards.length >= 2) return false;
    const lastHazard = state.hazards[state.hazards.length - 1];
    return !lastHazard || lastHazard.x < 650;
  }

  function spawnBomb() {
    const speed = 205 + (state.speedIndex * 62);
    state.hazards.push({
      type: 'bomb',
      x: 990,
      y: FLOOR_Y - BOMB_SIZE,
      width: BOMB_SIZE,
      height: BOMB_SIZE,
      destructible: false,
      counter: 'jump-or-inhale',
      vx: -speed,
      vy: BOUNCE_VY,
      bounceGravity: GRAVITY,
      phase: 0,
      low: true,
      bomb: true,
    });
  }

  function implodeBomb(bomb) {
    const index = state.hazards.indexOf(bomb);
    if (index >= 0) state.hazards.splice(index, 1);
    state.score += 125;
    state.flash = Math.max(state.flash, 0.16);
    try { globalThis.Lab8Audio?.play?.('destroy'); } catch {}
  }

  function inhale() {
    if (!state.running || state.mode !== 'RUNNER') return false;

    const mouthX = guido.x + guido.width;
    const mouthY = guido.y + guido.height * 0.45;
    const candidate = state.hazards
      .filter(isBomb)
      .map((bomb) => ({
        bomb,
        dx: bomb.x - mouthX,
        dy: Math.abs((bomb.y + bomb.height / 2) - mouthY),
      }))
      .filter(({ dx, dy }) => dx >= -10 && dx <= INHALE_RANGE && dy <= 125)
      .sort((a, b) => a.dx - b.dx)[0];

    if (!candidate) return false;
    implodeBomb(candidate.bomb);
    return true;
  }

  function updateBombs(dt) {
    for (const bomb of state.hazards) {
      if (!isBomb(bomb)) continue;
      bomb.vy = (bomb.vy ?? BOUNCE_VY) + GRAVITY * dt;
      bomb.y += bomb.vy * dt;
      const floor = FLOOR_Y - bomb.height;
      if (bomb.y >= floor) {
        bomb.y = floor;
        bomb.vy = BOUNCE_VY;
      }
    }
  }

  function loop(now) {
    const dt = Math.min(0.05, Math.max(0, (now - last) / 1000));
    last = now;

    if (state.mode === 'RUNNER' && state.running) {
      updateBombs(dt);
      spawnTimer -= dt;
      if (spawnTimer <= 0 && canSpawnBomb()) {
        spawnBomb();
        spawnTimer = randomSpawnDelay();
      }
    } else {
      spawnTimer = Math.min(spawnTimer, 1.5);
    }

    requestAnimationFrame(loop);
  }

  window.addEventListener('keydown', (event) => {
    if (event.key.toLowerCase() !== 'c') return;
    event.preventDefault();
    inhale();
  });

  const button = document.querySelector('[data-action="inhale"]');
  if (button) {
    button.addEventListener('pointerdown', (event) => {
      event.preventDefault();
      inhale();
    });
  }

  globalThis.Lab8Bomb = Object.freeze({
    inhale,
    _test: { isBomb, spawnBomb, canSpawnBomb, INHALE_RANGE },
  });

  requestAnimationFrame(loop);
})();
