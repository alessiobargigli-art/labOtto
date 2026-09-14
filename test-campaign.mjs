import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const sandbox = { console, globalThis: null };
sandbox.globalThis = sandbox;
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(new URL('./levels.js', import.meta.url), 'utf8'), sandbox);
vm.runInContext(fs.readFileSync(new URL('./campaign-core.js', import.meta.url), 'utf8'), sandbox);
vm.runInContext(fs.readFileSync(new URL('./campaign-game.js', import.meta.url), 'utf8'), sandbox);

const levels = sandbox.Lab8Levels.all;
const api = sandbox.Lab8Campaign;
const game = sandbox.Lab8CampaignGame;

assert.equal(levels.length, 4);
assert.deepEqual(Array.from(levels, (x) => x.id), ['lab','home','underwater','mars']);
assert.equal(levels[0].bossType, 'palace');
assert.equal(levels[1].bossType, 'alien');
assert.equal(levels[2].bossType, 'palace');
assert.equal(levels[3].bossType, 'alien');

const labJump = api.jumpMetrics(levels[0]);
const waterJump = api.jumpMetrics(levels[2]);
const marsJump = api.jumpMetrics(levels[3]);
assert.ok(waterJump.airTime > labJump.airTime);
assert.ok(marsJump.airTime > labJump.airTime);
assert.ok(marsJump.rise > 100);

assert.equal(api.clampHazardSpeed(levels[0], 0.1), levels[0].hazardSpeed[0]);
assert.equal(api.clampHazardSpeed(levels[0], 9), levels[0].hazardSpeed[1]);
assert.equal(api.hazardReachable(levels[0], { counter:'shoot', destructible:true }, 280), true);
assert.equal(api.hazardReachable(levels[0], { counter:'shoot', destructible:false }, 280), false);
assert.equal(api.hazardReachable(levels[0], { counter:'jump', height:500 }, 280), false);

const campaign = api.createCampaignState();
assert.equal(campaign.lives, 3);
let damage = api.loseLife(campaign);
assert.equal(damage.lost, true);
assert.equal(campaign.lives, 2);
damage = api.loseLife(campaign);
assert.equal(damage.lost, false, 'invulnerability prevents double damage');
campaign.invulnerable = 0;
api.loseLife(campaign);
campaign.invulnerable = 0;
damage = api.loseLife(campaign);
assert.equal(damage.gameOver, true);
assert.equal(campaign.lives, 0);

const extra = api.createCampaignState();
api.gainLife(extra); api.gainLife(extra); api.gainLife(extra);
assert.equal(extra.lives, api.MAX_LIVES);

const progression = api.createCampaignState();
assert.equal(api.advanceLevel(progression, 4, 2000), true);
assert.equal(progression.levelIndex, 1);
assert.equal(api.advanceLevel(progression, 4, 4000), true);
assert.equal(api.advanceLevel(progression, 4, 6000), true);
assert.equal(api.advanceLevel(progression, 4, 8000), false);
assert.equal(progression.completed, true);

game.reset();
assert.equal(game.level().id, 'lab');
let result = game.completeBoss(2200);
assert.equal(result.advanced, true);
assert.equal(game.level().id, 'home');

console.log('LAB-8 campaign tests: OK');
