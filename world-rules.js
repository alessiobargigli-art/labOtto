(() => {
  'use strict';

  const game = globalThis.Lab8Game?._test;
  if (!game?.state || !game?.level || !game?.enterBossStage) return;

  const state = game.state;
  const level = game.level;
  const FRIDGE_MIN_SECONDS = 9;
  const FRIDGE_MAX_SECONDS = 15;
  const FRIDGE_SIZE = { width: 42, height: 62 };

  const CATALOGS = Object.freeze({
    lab: [
      { type: 'tube', destructible: true },
      { type: 'potion', destructible: true, flying: true },
      { type: 'potion-armored', destructible: false, flying: true },
    ],
    home: [
      { type: 'television', destructible: true, tall: true },
      { type: 'wardrobe', destructible: false, tall: true },
      { type: 'pan', destructible: true, flying: true },
      { type: 'pan-armored', destructible: false, flying: true },
    ],
    underwater: [
      { type: 'baby-octopus', destructible: true },
      { type: 'flying-fish', destructible: true, flying: true },
      { type: 'flying-fish-armored', destructible: false, flying: true },
    ],
    mars: [
      { type: 'alien', destructible: true },
      { type: 'alien-armored', destructible: false },
      { type: 'spaceship', destructible: true, flying: true },
      { type: 'spaceship-armored', destructible: false, flying: true },
    ],
  });

  let fridgeTimer = randomFridgeDelay();
  let last = performance.now();

  for (const lvl of globalThis.Lab8Levels?.all ?? []) {
    lvl.bossAfterScore = Number.POSITIVE_INFINITY;
  }

  function randomFridgeDelay() {
    return FRIDGE_MIN_SECONDS + Math.random() * (FRIDGE_MAX_SECONDS - FRIDGE_MIN_SECONDS);
  }

  function isFridge(h) { return h?.type === 'fridge'; }
  function isSpecialNonFridge(h) { return h?.type === 'bomb' || h?.type?.startsWith('boss-'); }

  function applyDescriptor(h, descriptor) {
    h.type = descriptor.type;
    h.destructible = descriptor.destructible;
    h.counter = descriptor.destructible ? 'shoot' : (descriptor.flying ? 'duck-or-jump' : 'jump');
    h.width = descriptor.flying ? 44 : (descriptor.tall ? 44 : 36);
    h.height = descriptor.flying ? 24 : (descriptor.tall ? 58 : 36);
    if (descriptor.flying) {
      const low = Math.random() < 0.58;
      h.low = low;
      h.y = low ? 244 : 172;
    } else {
      h.low = true;
      h.y = 302 - h.height;
    }
    h.worldStyled = true;
  }

  function styleNewHazards() {
    const id = level().id;
    const catalog = CATALOGS[id] ?? CATALOGS.lab;
    for (const h of state.hazards) {
      if (h.worldStyled || isSpecialNonFridge(h)) continue;

      if (isFridge(h)) {
        if (Math.random() < 0.25) {
          h.destructible = false;
          h.counter = 'boss-gateway';
          h.worldStyled = true;
          h.bossGateway = true;
          continue;
        }
        applyDescriptor(h, catalog[Math.floor(Math.random() * catalog.length)]);
        continue;
      }

      applyDescriptor(h, catalog[Math.floor(Math.random() * catalog.length)]);
    }
  }

  function canSpawnFridge() {
    if (!state.running || state.mode !== 'RUNNER' || state.transition > 0) return false;
    if (state.hazards.some(isFridge)) return false;
    if (state.hazards.length > 0) return false;
    return true;
  }

  function spawnFridge() {
    const lvl = level();
    const speed = (190 + state.speedIndex * 90) * (lvl.speedMultiplier ?? 1);
    state.hazards.push({
      type: 'fridge',
      x: 990,
      y: 302 - FRIDGE_SIZE.height,
      width: FRIDGE_SIZE.width,
      height: FRIDGE_SIZE.height,
      destructible: false,
      counter: 'boss-gateway',
      vx: -speed * 0.9,
      phase: 0,
      low: true,
      worldStyled: true,
      bossGateway: true,
    });
  }

  function fridgeWasShot() {
    const fridge = state.hazards.find(isFridge);
    if (!fridge) return false;
    return state.bullets.some((bullet) => {
      if (!bullet.reflected || bullet.vx >= 0) return false;
      const horizontal = Math.abs((bullet.x + bullet.width) - fridge.x);
      const vertical = Math.abs((bullet.y + bullet.height / 2) - (fridge.y + fridge.height / 2));
      return horizontal <= 24 && vertical <= fridge.height / 2 + 20;
    });
  }

  function enterBossFromFridge() {
    if (state.mode !== 'RUNNER' || !fridgeWasShot()) return;
    state.hazards.length = 0;
    state.bullets.length = 0;
    try { globalThis.Lab8Audio?.play?.('boss-enter'); } catch {}
    game.enterBossStage();
    fridgeTimer = randomFridgeDelay();
  }

  function loop(now) {
    const dt = Math.min(0.05, Math.max(0, (now - last) / 1000));
    last = now;

    if (state.mode === 'RUNNER' && state.running) {
      styleNewHazards();
      enterBossFromFridge();
      fridgeTimer -= dt;
      if (fridgeTimer <= 0 && canSpawnFridge()) {
        spawnFridge();
        fridgeTimer = randomFridgeDelay();
      }
    } else {
      fridgeTimer = Math.min(fridgeTimer, 2.5);
    }

    requestAnimationFrame(loop);
  }

  globalThis.Lab8WorldRules = Object.freeze({
    CATALOGS,
    _test: { isFridge, spawnFridge, canSpawnFridge, fridgeWasShot },
  });

  requestAnimationFrame(loop);
})();
