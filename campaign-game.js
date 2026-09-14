(() => {
  'use strict';

  const levels = globalThis.Lab8Levels?.all || [];
  const campaignApi = globalThis.Lab8Campaign;
  if (!levels.length || !campaignApi) return;

  const state = globalThis.Lab8CampaignState = campaignApi.createCampaignState();

  function level() { return levels[state.levelIndex]; }
  function reset() {
    Object.assign(state, campaignApi.createCampaignState());
  }

  function takeDamage() {
    const result = campaignApi.loseLife(state);
    return result;
  }

  function tick(dt) {
    state.invulnerable = Math.max(0, state.invulnerable - dt);
  }

  function addLife() { return campaignApi.gainLife(state); }

  function completeBoss(score) {
    const advanced = campaignApi.advanceLevel(state, levels.length, score);
    return { advanced, completed: state.completed, level: level() };
  }

  globalThis.Lab8CampaignGame = Object.freeze({ state, level, reset, takeDamage, tick, addLife, completeBoss });
})();
