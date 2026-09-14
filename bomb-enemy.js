(() => {
  'use strict';

  const game = globalThis.Lab8Game?._test;
  if (!game?.state || !game?.guido || !game?.level) return;

  const state = game.state;
  const guido = game.guido;
  const canvasWrap = document.querySelector('.canvas-wrap');
  const INHALE_RANGE = 250;
  const BOMB_SIZE = 30;
  const FLOOR_Y = 302;
  const GRAVITY = 1500;
  const BOUNCE_VY = -510;
  const MIN_SPAWN_SECONDS = 5.5;
  const MAX_SPAWN_SECONDS = 8.5;
  const INGEST_DELAY_MS = 320;

  let spawnTimer = randomSpawnDelay();
  let last = performance.now();
  let ingesting = false;

  const beam = document.createElement('div');
  beam.className = 'inhale-beam';
  Object.assign(beam.style, {
    position: 'absolute',
    left: '16.5%',
    top: '58%',
    width: '26%',
    height: '20%',
    transformOrigin: 'left center',
    clipPath: 'polygon(0 42%, 100% 0, 100% 100%, 0 58%)',
    background: 'repeating-linear-gradient(90deg, rgba(230,255,207,.72) 0 8px, rgba(246,200,95,.34) 8px 16px)',
    borderRight: '4px solid rgba(246,200,95,.9)',
    filter: 'drop-shadow(0 0 8px rgba(230,255,207,.75))',
    opacity: '0',
    pointerEvents: 'none',
    zIndex: '4',
    transition: 'opacity .08s linear, transform .16s ease-out',
  });
  beam.hidden = true;
  canvasWrap?.appendChild(beam);

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
      worldStyled: true,
    });
  }

  function playInhaleSound() {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(180, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(520, ctx.currentTime + 0.22);
      gain.gain.setValueAtTime(0.0001, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.12, ctx.currentTime + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.25);
      osc.connect(gain).connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.26);
      osc.onended = () => ctx.close().catch(() => {});
    } catch {}
  }

  function showInhaleBeam() {
    if (!beam) return;
    beam.hidden = false;
    beam.style.opacity = '0.9';
    beam.style.transform = 'scaleX(1.08)';
    setTimeout(() => {
      beam.style.opacity = '0';
      beam.style.transform = 'scaleX(.8)';
      setTimeout(() => { beam.hidden = true; }, 90);
    }, 280);
  }

  function blastAfterIngestion() {
    const cleared = state.hazards.length;
    state.hazards.length = 0;
    state.bullets.length = 0;
    state.score += 125 + cleared * 35;
    state.flash = Math.max(state.flash, 0.65);
    try { globalThis.Lab8Audio?.play?.('destroy'); } catch {}
    setTimeout(() => { ingesting = false; }, 120);
  }

  function ingestBomb(bomb) {
    const index = state.hazards.indexOf(bomb);
    if (index >= 0) state.hazards.splice(index, 1);
    ingesting = true;
    bomb.ingested = true;
    playInhaleSound();
    showInhaleBeam();
    setTimeout(blastAfterIngestion, INGEST_DELAY_MS);
  }

  function inhale() {
    if (!state.running || state.mode !== 'RUNNER' || ingesting) return false;

    playInhaleSound();
    showInhaleBeam();

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
    ingestBomb(candidate.bomb);
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
