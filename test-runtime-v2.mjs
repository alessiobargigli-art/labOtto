import fs from 'node:fs';
import assert from 'node:assert/strict';

const html = fs.readFileSync(new URL('./index.html', import.meta.url), 'utf8');
const game = fs.readFileSync(new URL('./game-v2.js', import.meta.url), 'utf8');
const levels = fs.readFileSync(new URL('./levels.js', import.meta.url), 'utf8');
const sw = fs.readFileSync(new URL('./sw.js', import.meta.url), 'utf8');

assert.match(html, /VERSIONE 2\.0\.0/);
assert.match(html, /<script src="levels\.js"><\/script>/);
assert.match(html, /<script src="campaign-core\.js"><\/script>/);
assert.match(html, /<script src="game-v2\.js"><\/script>/);
assert.doesNotMatch(html, /<script src="game\.js"><\/script>/);

for (const world of ['LABORATORIO', 'CASA', "SOTT\\'ACQUA", 'MARTE']) {
  assert.ok(levels.includes(world), `missing level ${world}`);
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
assert.match(sw, /lab8-v2\.0\.0/);
assert.match(sw, /game-v2\.js/);

console.log('LAB-8 2.0 runtime wiring: OK');
