(() => {
  'use strict';

  const game = globalThis.Lab8Game?._test;
  if (!game?.state || !game?.makeHazard || !game?.level) return;

  const state = game.state;
  const level = game.level;
  const MAX_ACTIVE_HAZARDS = 2;
  const INTERVALS = Object.freeze({
    lab: 1.00,
    home: 0.90,
    underwater: 1.10,
    mars: 0.95,
  });

  let accumulator = 0;
  let last = performance.now();

  function canSpawn() {
    if (!state.running || state.mode !== 'RUNNER') return false;
    if (state.transition > 0) return false;
    if (state.hazards.length >= MAX_ACTIVE_HAZARDS) return false;

    const lastHazard = state.hazards[state.hazards.length - 1];
    if (lastHazard && lastHazard.x > 700) return false;
    return true;
  }

  function spawnOne() {
    const lvl = level();
    const hazard = game.makeHazard();
    const worldSpeed = Math.abs(hazard.vx || 1);
    if (!globalThis.Lab8Campaign?.hazardReachable?.(lvl, hazard, worldSpeed)) return false;
    state.hazards.push(hazard);
    return true;
  }

  function loop(now) {
    const dt = Math.min(0.05, Math.max(0, (now - last) / 1000));
    last = now;

    if (state.mode === 'RUNNER' && state.running) {
      accumulator += dt;
      const interval = INTERVALS[level().id] ?? 1.0;
      if (accumulator >= interval && canSpawn()) {
        if (spawnOne()) accumulator = 0;
        else accumulator = interval * 0.5;
      }
    } else {
      accumulator = 0;
    }

    requestAnimationFrame(loop);
  }

  requestAnimationFrame(loop);
})();
