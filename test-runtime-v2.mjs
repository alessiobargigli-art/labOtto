import fs from 'node:fs';
import assert from 'node:assert/strict';

const html = fs.readFileSync(new URL('./index.html', import.meta.url), 'utf8');
const game = fs.readFileSync(new URL('./game-v2.js', import.meta.url), 'utf8');
const levels = fs.readFileSync(new URL('./levels.js', import.meta.url), 'utf8');
const sw = fs.readFileSync(new URL('./sw.js', import.meta.url), 'utf8');
const bomb = fs.readFileSync(new URL('./bomb-enemy.js', import.meta.url), 'utf8');
const worlds = fs.readFileSync(new URL('./world-rules.js', import.meta.url), 'utf8');

assert.match(html, /VERSIONE 2\.0\.4/);
assert.match(html, /<script src="levels\.js"><\/script>/);
assert.match(html, /<script src="campaign-core\.js"><\/script>/);
assert.match(html, /<script src="game-v2\.js"><\/script>/);
assert.match(html, /<script src="world-rules\.js"><\/script>/);
assert.match(html, /<script src="spawn-patterns\.js"><\/script>/);
assert.match(html, /<script src="spawn-tuning\.js"><\/script>/);
assert.match(html, /<script src="bomb-enemy\.js"><\/script>/);
assert.match(html, /data-action="inhale"/);
assert.match(html, /Aspira: <kbd>C<\/kbd>/);
assert.doesNotMatch(html, /<script src="game\.js"><\/script>/);

for (const world of ['LABORATORIO', 'CASA', "SOTT\\'ACQUA", 'MARTE']) {
  assert.ok(levels.includes(world), `missing level ${world}`);
}

for (const hazard of ['zombie-tube','sofa','plane','bottle','fish','boot','alien','spaceship','fridge']) {
  assert.ok(levels.includes(hazard), `missing world hazard ${hazard}`);
}

assert.match(game, /createCampaignState\(\)/);
assert.match(game, /VITE/);
assert.match(game, /gainLife/);
assert.match(game, /loseLife/);
assert.match(game, /bossType/);
assert.match(game, /ALIENO GIGANTE/);
assert.match(game, /MEGA PALAZZO/);
assert.match(game, /advanceLevel/);
assert.match(game, /hazardReachable/);
assert.match(game, /clampHazardSpeed/);
assert.match(game, /alienBossOffset/);

assert.match(worlds, /bossAfterScore = Number\.POSITIVE_INFINITY/);
assert.match(worlds, /boss-gateway/);
assert.match(worlds, /fridgeWasShot/);
assert.match(worlds, /zombie-tube/);
assert.match(worlds, /spaceship/);

assert.match(bomb, /type: 'bomb'/);
assert.match(bomb, /function inhale\(\)/);
assert.match(bomb, /BOUNCE_VY/);
assert.match(bomb, /INHALE_RANGE = 250/);
assert.match(bomb, /inhale-beam/);
assert.match(bomb, /blastAfterIngestion/);
assert.match(bomb, /state\.hazards\.length = 0/);

assert.match(sw, /lab8-v2\.0\.4/);
assert.match(sw, /game-v2\.js/);
assert.match(sw, /world-rules\.js/);
assert.match(sw, /spawn-patterns\.js/);
assert.match(sw, /spawn-tuning\.js/);
assert.match(sw, /bomb-enemy\.js/);

console.log('LAB-8 2.0.4 runtime wiring: OK');
