(() => {
  'use strict';

  const STARTING_LIVES = 3;
  const MAX_LIVES = 5;
  const INVULNERABILITY_SECONDS = 1.5;

  function jumpMetrics(level, guidoHeight = 38) {
    const gravity = level.physics.gravity;
    const jumpVelocity = Math.abs(level.physics.jumpVelocity);
    const rise = (jumpVelocity * jumpVelocity) / (2 * gravity);
    const airTime = (2 * jumpVelocity) / gravity;
    return {
      rise,
      airTime,
      maxObstacleHeight: Math.max(18, rise - guidoHeight * 0.35),
    };
  }

  function hazardReachable(level, hazard, worldSpeed) {
    const metrics = jumpMetrics(level);
    if (hazard.counter === 'shoot') return hazard.destructible !== false;
    if (hazard.counter === 'duck') return hazard.y + hazard.height < 260;
    if (hazard.counter === 'jump') return hazard.height <= metrics.maxObstacleHeight;

    if (hazard.destructible) return true;
    const effectiveSpeed = Math.max(1, Math.abs(hazard.vx || worldSpeed));
    const reactionSeconds = Math.max(0.45, (hazard.x - 126) / effectiveSpeed);
    return hazard.height <= metrics.maxObstacleHeight && reactionSeconds >= 0.45;
  }

  function clampHazardSpeed(level, requestedMultiplier) {
    const [min, max] = level.hazardSpeed;
    return Math.max(min, Math.min(max, requestedMultiplier));
  }

  function createCampaignState() {
    return {
      levelIndex: 0,
      lives: STARTING_LIVES,
      invulnerable: 0,
      levelScoreStart: 0,
      completed: false,
    };
  }

  function loseLife(campaign) {
    if (campaign.invulnerable > 0 || campaign.completed) return { lost: false, gameOver: false };
    campaign.lives = Math.max(0, campaign.lives - 1);
    campaign.invulnerable = INVULNERABILITY_SECONDS;
    return { lost: true, gameOver: campaign.lives <= 0 };
  }

  function gainLife(campaign) {
    const before = campaign.lives;
    campaign.lives = Math.min(MAX_LIVES, campaign.lives + 1);
    return campaign.lives > before;
  }

  function advanceLevel(campaign, totalLevels, score) {
    if (campaign.levelIndex + 1 >= totalLevels) {
      campaign.completed = true;
      return false;
    }
    campaign.levelIndex += 1;
    campaign.levelScoreStart = score;
    campaign.invulnerable = INVULNERABILITY_SECONDS;
    return true;
  }

  globalThis.Lab8Campaign = Object.freeze({
    STARTING_LIVES,
    MAX_LIVES,
    INVULNERABILITY_SECONDS,
    jumpMetrics,
    hazardReachable,
    clampHazardSpeed,
    createCampaignState,
    loseLife,
    gainLife,
    advanceLevel,
  });
})();
