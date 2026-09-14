(() => {
  'use strict';

  const api = globalThis.Lab8Game?._test;
  const campaignApi = globalThis.Lab8Campaign;
  if (!api || !campaignApi) return;

  const state = api.state;
  const level = api.level;
  const baseMakeHazard = api.makeHazard;

  const CLUSTER_CHANCE = 0.34;
  const MIN_BLOCK_GAP = 8;
  const MAX_BLOCK_GAP = 14;
  const MIN_HEIGHT = 26;

  function worldSpeed() {
    const speeds = [190, 280, 390];
    return speeds[state.speedIndex] * level().speedMultiplier;
  }

  function scheduleNextSpawn() {
    const [min, max] = level().hazardGap;
    state.spawnDistance = min + Math.random() * (max - min);
    state.levelDistance = 0;
  }

  function clusterType() {
    switch (level().id) {
      case 'home': return 'furniture';
      case 'underwater': return 'reef';
      case 'mars': return 'rockwall';
      default: return 'labwall';
    }
  }

  function makeCluster() {
    const lvl = level();
    const metrics = campaignApi.jumpMetrics(lvl);
    const maxSafeHeight = Math.max(MIN_HEIGHT + 8, Math.floor(metrics.maxObstacleHeight * 0.78));
    const count = Math.random() < 0.32 ? 3 : 2;
    const gap = MIN_BLOCK_GAP + Math.floor(Math.random() * (MAX_BLOCK_GAP - MIN_BLOCK_GAP + 1));
    const blockWidth = 30 + Math.floor(Math.random() * 9);
    const speedMultiplier = campaignApi.clampHazardSpeed(
      lvl,
      lvl.hazardSpeed[0] + Math.random() * (lvl.hazardSpeed[1] - lvl.hazardSpeed[0])
    );
    const vx = -worldSpeed() * speedMultiplier;

    const heights = [];
    for (let i = 0; i < count; i++) {
      const wave = i === 1 ? 1 : 0.72;
      const upper = Math.max(MIN_HEIGHT + 6, Math.floor(maxSafeHeight * wave));
      heights.push(MIN_HEIGHT + Math.floor(Math.random() * Math.max(1, upper - MIN_HEIGHT)));
    }

    // Il blocco centrale è spesso il più alto: richiede di impostare bene il salto,
    // ma resta entro una frazione conservativa dell'altezza massima raggiungibile.
    if (count >= 2) heights[1] = Math.max(heights[1], Math.floor(maxSafeHeight * 0.82));

    const totalWidth = count * blockWidth + (count - 1) * gap;
    const jumpTravel = Math.max(1, metrics.airTime * Math.abs(vx));
    if (totalWidth > jumpTravel * 0.68) return null;

    const hazards = [];
    let x = 990;
    for (let i = 0; i < count; i++) {
      const height = Math.min(maxSafeHeight, heights[i]);
      const hazard = {
        type: `${clusterType()}-${i + 1}`,
        x,
        y: 302 - height,
        width: blockWidth,
        height,
        destructible: false,
        counter: 'jump',
        vx,
        phase: 0,
        low: true,
        clustered: true,
      };
      if (!campaignApi.hazardReachable(lvl, hazard, worldSpeed())) return null;
      hazards.push(hazard);
      x += blockWidth + gap;
    }
    return hazards;
  }

  function addLifePickup() {
    if (Math.random() < 0.06 && api.campaign.lives < campaignApi.MAX_LIVES) {
      state.pickups.push({ x: 1070, y: 210, width: 24, height: 24, vx: -worldSpeed() * 0.9, phase: 0 });
    }
  }

  globalThis.spawnHazard = function spawnHazardClusterAware() {
    if (Math.random() < CLUSTER_CHANCE) {
      const cluster = makeCluster();
      if (cluster) {
        state.hazards.push(...cluster);
        scheduleNextSpawn();
        addLifePickup();
        return;
      }
    }

    let hazard = baseMakeHazard();
    if (!campaignApi.hazardReachable(level(), hazard, worldSpeed())) {
      hazard = {
        type: 'safe-crate',
        x: 990,
        y: 272,
        width: 34,
        height: 30,
        destructible: true,
        counter: 'shoot',
        vx: -worldSpeed(),
        phase: 0,
        low: true,
      };
    }
    state.hazards.push(hazard);
    scheduleNextSpawn();
    addLifePickup();
  };

  globalThis.Lab8SpawnPatterns = Object.freeze({
    clusterChance: CLUSTER_CHANCE,
    _test: { makeCluster },
  });
})();
