import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const noop = () => {};
const ctx2d = new Proxy({}, { get: (t,p) => t[p] ?? noop, set: (t,p,v) => (t[p]=v,true) });
const canvas = { width:960, height:360, getContext:()=>ctx2d, addEventListener:noop, focus:noop };
const button = { addEventListener:noop, classList:{add:noop,remove:noop}, dataset:{action:'jump'}, setPointerCapture:noop };
const document = {
  querySelector: (s) => s === '#game' ? canvas : null,
  querySelectorAll: () => [button],
  addEventListener: noop,
};
const sandbox = {
  console,
  document,
  navigator:{ serviceWorker:{ register:()=>Promise.resolve() } },
  window:{ addEventListener:noop },
  localStorage:{ getItem:()=>null, setItem:noop },
  performance:{ now:()=>0 },
  requestAnimationFrame:noop,
  Math:Object.create(Math),
};
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(new URL('./game.js', import.meta.url), 'utf8'), sandbox);
const run = (code) => vm.runInContext(code, sandbox);

// Existing runner obstacles stay intact.
run('resetGame()');
run('spawnCrate()');
assert.equal(run('state.obstacles[0].type'), 'crate');
assert.equal(run('state.obstacles[0].height'), 34);
assert.ok(run('state.spawnDistance >= CONFIG.hazardMinGap'));

run('resetGame(); spawnFridge()');
assert.equal(run('state.obstacles[0].type'), 'fridge');
assert.equal(run('state.obstacles[0].height'), 76);
assert.ok(run('state.spawnDistance >= CONFIG.tallHazardMinGap'));

run('resetGame(); Math.random = () => 0.1; spawnFlyer()');
assert.equal(run('state.obstacles[0].type'), 'flyer');
assert.equal(run('state.obstacles[0].low'), true);
assert.ok(run('state.spawnDistance >= CONFIG.flyingHazardMinGap'));
assert.ok(run('state.obstacles[0].y + state.obstacles[0].height > guido.y + 4'), 'low flyer must require a jump');

run(`resetGame();
state.obstacles.push({type:'crate',x:500,y:268,width:46,height:34});
state.bullets.push({x:498,y:275,width:10,height:4,vx:CONFIG.bulletSpeed,reflected:false});
update(0.001);`);
assert.equal(run('state.obstacles.length'), 1, 'indestructible obstacle must survive bullets');
assert.equal(run('state.bullets[0].reflected'), true);
assert.ok(run('state.bullets[0].vx < 0'));
assert.ok(run('state.particles.length >= CONFIG.sparkCount'));

run(`resetGame();
state.tubes.push({x:500,y:260,width:26,height:42,zombie:false,wobble:0});
state.bullets.push({x:498,y:275,width:10,height:4,vx:CONFIG.bulletSpeed,reflected:false});
update(0.001);`);
assert.equal(run('state.tubes.length'), 0, 'tube must remain destructible');
assert.equal(run('state.bullets.length'), 0);
assert.ok(run('state.score >= CONFIG.tubeScore'));

run(`resetGame();
state.obstacles.push({type:'crate',x:guido.x+5,y:CONFIG.groundY-34,width:46,height:34});
update(0);`);
assert.equal(run('state.mode'), 'GAME_OVER', 'Guido must collide with indestructible obstacles');

run(`resetGame(); const beforeT=state.tubes.length; const beforeO=state.obstacles.length; Math.random=()=>0.1; spawnHazard(); globalThis.spawnDelta=(state.tubes.length-beforeT)+(state.obstacles.length-beforeO);`);
assert.equal(run('spawnDelta'), 1, 'one spawn window must add exactly one hazard');

// Fridge frequency is explicitly rare and protected against consecutive/nearby spawns.
run(`resetGame();
let seed=123456789;
Math.random=()=>{ seed=(1664525*seed+1013904223)>>>0; return seed/4294967296; };
globalThis.fridgeIndices=[];
for(let i=0;i<600;i++){
  spawnHazard();
  if(state.lastHazardType==='fridge') fridgeIndices.push(i);
  state.tubes.length=0; state.obstacles.length=0;
}
globalThis.fridgeCount=fridgeIndices.length;
globalThis.fridgeMinObservedGap=fridgeIndices.length>1 ? Math.min(...fridgeIndices.slice(1).map((v,i)=>v-fridgeIndices[i])) : 999;
`);
assert.ok(run('CONFIG.fridgeChance <= 0.05'), 'fridge should be configured as a rare event');
assert.ok(run('fridgeCount > 0 && fridgeCount < 45'), 'fridge should be much rarer than ordinary hazards');
assert.ok(run('fridgeMinObservedGap > CONFIG.fridgeMinSpawnSeparation'), 'fridges must not spawn consecutively or too close');

// Hitting the fridge opens the Boss automatically.
run(`resetGame(); Math.random=Math.__proto__.random ?? Math.random;
state.obstacles.push({type:'fridge',x:500,y:CONFIG.groundY-76,width:42,height:76});
state.bullets.push({x:498,y:250,width:10,height:4,vx:CONFIG.bulletSpeed,reflected:false});
update(0.001);`);
assert.equal(run('state.mode'), 'BOSS');
assert.ok(run('state.boss.transition > 0'));
assert.equal(run('state.obstacles.length'), 0, 'runner hazards are suspended on Boss entry');

// Jumping over the fridge does not enter the Boss.
run(`resetGame();
guido.y=120; guido.vy=0; guido.grounded=false;
state.obstacles.push({type:'fridge',x:guido.x+5,y:CONFIG.groundY-76,width:42,height:76});
update(0);`);
assert.equal(run('state.mode'), 'RUNNER');

// Boss destructible attacks can be shot.
run(`resetGame(); enterBossStage(); state.boss.transition=0; state.boss.phase='attack'; state.boss.timer=10; state.boss.attackTimer=10;
state.bossAttacks.push({type:'destructible',x:500,y:268,width:26,height:26,vx:0,phase:0});
state.bullets.push({x:498,y:275,width:10,height:4,vx:CONFIG.bulletSpeed,reflected:false});
update(0.001);`);
assert.equal(run('state.bossAttacks.length'), 0, 'destructible Boss attack should be destroyed');
assert.equal(run('state.bullets.length'), 0);

// Boss indestructible attacks survive and reflect bullets.
run(`resetGame(); enterBossStage(); state.boss.transition=0; state.boss.phase='attack'; state.boss.timer=10; state.boss.attackTimer=10;
state.bossAttacks.push({type:'indestructible',x:500,y:268,width:34,height:34,vx:0,phase:0});
state.bullets.push({x:498,y:275,width:10,height:4,vx:CONFIG.bulletSpeed,reflected:false});
update(0.001);`);
assert.equal(run('state.bossAttacks.length'), 1, 'indestructible Boss attack must survive');
assert.equal(run('state.bullets[0].reflected'), true);
assert.ok(run('state.bullets[0].vx < 0'));

// Boss collisions reuse the standard Game Over path.
run(`resetGame(); enterBossStage(); state.boss.transition=0; state.boss.phase='attack'; state.boss.timer=10; state.boss.attackTimer=10;
state.bossAttacks.push({type:'indestructible',x:guido.x+5,y:guido.y+4,width:30,height:30,vx:0,phase:0});
update(0);`);
assert.equal(run('state.mode'), 'GAME_OVER');
assert.equal(run('state.running'), false);

// Every Boss weak point must intersect the vertical band reachable by a normal shot.
run(`globalThis.jumpRise=(CONFIG.jumpVelocity*CONFIG.jumpVelocity)/(2*CONFIG.gravity);
globalThis.minBulletY=(CONFIG.groundY-guido.height-jumpRise)+15;
globalThis.maxBulletY=(CONFIG.groundY-guido.height)+15;
globalThis.weakReachability=BOSS_WEAK_POINT_Y.map((_,i)=>{
  const w=bossWeakPointRect(i);
  return { y:w.y, bottom:w.y+w.height, reachable: minBulletY < w.y+w.height && maxBulletY+4 > w.y };
});`);
assert.ok(run('weakReachability.every((w)=>w.reachable)'), 'all Boss weak points must be reachable with the normal jump + shot trajectory');
assert.ok(run('bossWeakPointRect(0).y + bossWeakPointRect(0).height - minBulletY > 10'), 'highest weak point needs practical vertical margin, not an apex-only pixel hit');

// FIRE! is visible for the whole vulnerable window and disappears on timeout.
run(`resetGame(); enterBossStage(); state.boss.transition=0; state.boss.phase='attack'; state.boss.timer=0.001; state.boss.attackTimer=10; update(0.01);`);
assert.equal(run('state.boss.phase'), 'vulnerable');
assert.equal(run('isBossFireVisible()'), true, 'FIRE must appear as soon as vulnerability starts');
run('state.boss.timer=0.001; update(0.01);');
assert.equal(run('state.boss.phase'), 'attack');
assert.equal(run('isBossFireVisible()'), false, 'FIRE must disappear as soon as vulnerability ends');

// Three exposed weak points complete the fight, award score and return to RUNNER.
run(`resetGame(); enterBossStage(); state.boss.transition=0; globalThis.scoreBeforeBossWin=state.score;`);
for (let i = 0; i < 3; i++) {
  run(`state.boss.phase='vulnerable'; state.boss.timer=10; state.bossAttacks.length=0;`);
  assert.equal(run('isBossFireVisible()'), true);
  run(`{ const w=bossWeakPointRect(state.boss.weakIndex); state.bullets.push({x:w.x-2,y:w.y+8,width:10,height:4,vx:CONFIG.bulletSpeed,reflected:false}); }
  update(0.001);`);
  assert.equal(run('state.boss.defeatedWeakPoints'), i + 1);
  assert.equal(run('isBossFireVisible()'), false, 'FIRE and blinking must stop immediately after a correct hit');
}
assert.equal(run("state.boss.phase"), 'victory');
assert.ok(run('state.score >= scoreBeforeBossWin + CONFIG.bossWeakPointScore * 3'));
run('state.boss.victoryTimer=0.001; update(0.01);');
assert.equal(run('state.mode'), 'RUNNER');
assert.ok(run('state.score >= scoreBeforeBossWin + CONFIG.bossWeakPointScore * 3 + CONFIG.bossVictoryBonus'));
assert.equal(run('state.bossAttacks.length'), 0);

// Input path stays shared for keyboard/touch actions and speed remains available in Boss mode.
run(`resetGame(); enterBossStage(); state.boss.transition=0; const before=state.speedIndex; handleAction('faster'); globalThis.speedChanged=state.speedIndex>before; handleAction('shoot');`);
assert.equal(run('speedChanged'), true);
assert.equal(run('state.bullets.length'), 1);

console.log('LAB-8 gameplay + Boss tests: OK');
