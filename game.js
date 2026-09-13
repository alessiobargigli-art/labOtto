const canvas = document.querySelector('#game');
const ctx = canvas.getContext('2d');
ctx.imageSmoothingEnabled = false;

const MODES = Object.freeze({ RUNNER: 'RUNNER', BOSS: 'BOSS', GAME_OVER: 'GAME_OVER' });

const CONFIG = Object.freeze({
  width: canvas.width,
  height: canvas.height,
  groundY: 302,
  gravity: 1850,
  jumpVelocity: -690,
  speeds: [190, 280, 390],
  initialSpeedIndex: 1,
  hazardMinGap: 285,
  hazardMaxGap: 500,
  tallHazardMinGap: 345,
  flyingHazardMinGap: 330,
  fridgeChance: 0.035,
  fridgeMinSpawnSeparation: 5,
  bulletSpeed: 610,
  shootCooldown: 0.22,
  dayNightSeconds: 18,
  scorePerSecond: 12,
  tubeScore: 80,
  sparkCount: 6,
  bossTransitionSeconds: 0.75,
  bossAttackSeconds: 3.2,
  bossVulnerableSeconds: 1.8,
  bossAttackInterval: 0.95,
  bossAttackSpeed: 330,
  bossWeakPointScore: 350,
  bossVictoryBonus: 1800,
  bossVictorySeconds: 2.1,
  maxDelta: 1 / 20,
});

const PALETTES = {
  day: { sky:'#d8f3dc', dark:'#16324f', mid:'#2d6a4f', hot:'#f4a261', hazard:'#ffd60a' },
  night: { sky:'#10233c', dark:'#f1fa8c', mid:'#ffb703', hot:'#ff4d6d', hazard:'#ffd60a' },
};

const state = {
  mode: MODES.RUNNER, running:true, score:0,
  best:Number(localStorage.getItem('lab8.best') || 0), elapsed:0,
  speedIndex:CONFIG.initialSpeedIndex, spawnDistance:330, worldDistance:0,
  tubes:[], obstacles:[], bullets:[], particles:[], flash:0,
  lastHazardType:null, spawnsSinceFridge:CONFIG.fridgeMinSpawnSeparation,
  bossAttacks:[],
  boss:{ transition:0, phase:'attack', timer:0, attackTimer:0, weakIndex:0, defeatedWeakPoints:0, victoryTimer:0, hitFlash:0 },
};

const guido = { x:126, y:CONFIG.groundY-38, width:34, height:38, vy:0, grounded:true, shootTimer:0, runFrame:0 };
function palette(){ return isNight()?PALETTES.night:PALETTES.day; }
function isNight(){ return Math.floor(state.elapsed/CONFIG.dayNightSeconds)%2===1; }
function currentSpeed(){ return CONFIG.speeds[state.speedIndex]; }
function rand(min,max){ return min+Math.random()*(max-min); }
function rectsOverlap(a,b,inset=0){ return a.x+inset<b.x+b.width-inset&&a.x+a.width-inset>b.x+inset&&a.y+inset<b.y+b.height-inset&&a.y+a.height-inset>b.y+inset; }

function resetGame(){
  state.mode=MODES.RUNNER; state.running=true; state.score=0; state.elapsed=0; state.speedIndex=CONFIG.initialSpeedIndex;
  state.spawnDistance=330; state.worldDistance=0; state.tubes.length=0; state.obstacles.length=0; state.bullets.length=0; state.particles.length=0;
  state.flash=0; state.lastHazardType=null; state.spawnsSinceFridge=CONFIG.fridgeMinSpawnSeparation; state.bossAttacks.length=0;
  Object.assign(state.boss,{transition:0,phase:'attack',timer:0,attackTimer:0,weakIndex:0,defeatedWeakPoints:0,victoryTimer:0,hitFlash:0});
  guido.y=CONFIG.groundY-guido.height; guido.vy=0; guido.grounded=true; guido.shootTimer=0;
}
function jump(){ if(state.mode===MODES.GAME_OVER)return; if(guido.grounded){guido.vy=CONFIG.jumpVelocity;guido.grounded=false;} }
function shoot(){ if(state.mode===MODES.GAME_OVER||guido.shootTimer>0)return; guido.shootTimer=CONFIG.shootCooldown; state.bullets.push({x:guido.x+guido.width-2,y:guido.y+15,width:10,height:4,vx:CONFIG.bulletSpeed,reflected:false}); }
function changeSpeed(direction){ state.speedIndex=Math.max(0,Math.min(CONFIG.speeds.length-1,state.speedIndex+direction)); }
function handleAction(action){ if(state.mode===MODES.GAME_OVER&&(action==='jump'||action==='shoot')){resetGame();return;} if(action==='jump')jump(); if(action==='shoot')shoot(); if(action==='slower')changeSpeed(-1); if(action==='faster')changeSpeed(1); }
window.addEventListener('keydown',(event)=>{const key=event.key.toLowerCase();if([' ','arrowup','w','x','f','+','=','-','_','r','enter'].includes(key))event.preventDefault();if(key===' '||key==='arrowup'||key==='w')handleAction('jump');else if(key==='x'||key==='f')handleAction('shoot');else if(key==='+'||key==='=')handleAction('faster');else if(key==='-'||key==='_')handleAction('slower');else if((key==='r'||key==='enter')&&!state.running)resetGame();});
function bindPressAction(button){const release=(event)=>{if(event)event.preventDefault();button.classList.remove('is-pressed');};button.addEventListener('pointerdown',(event)=>{event.preventDefault();button.classList.add('is-pressed');if(button.setPointerCapture){try{button.setPointerCapture(event.pointerId);}catch{}}handleAction(button.dataset.action);});button.addEventListener('pointerup',release);button.addEventListener('pointercancel',release);button.addEventListener('lostpointercapture',release);button.addEventListener('contextmenu',(event)=>event.preventDefault());}
document.querySelectorAll('[data-action]').forEach(bindPressAction);
canvas.addEventListener('pointerdown',(event)=>{event.preventDefault();if(state.mode===MODES.GAME_OVER)resetGame();else jump();});
canvas.addEventListener('contextmenu',(event)=>event.preventDefault());
['touchstart','touchmove','gesturestart','gesturechange'].forEach((eventName)=>document.addEventListener(eventName,(event)=>{if(event.target.closest?.('.game-frame'))event.preventDefault();},{passive:false}));

function setNextSpawnDistance(minGap=CONFIG.hazardMinGap){state.spawnDistance=rand(minGap,CONFIG.hazardMaxGap);state.worldDistance=0;}
function markHazardSpawn(type){state.lastHazardType=type;if(type==='fridge')state.spawnsSinceFridge=0;else state.spawnsSinceFridge+=1;}
function spawnTube(){const tall=Math.random()<0.3,width=tall?30:26,height=tall?54:42;state.tubes.push({x:CONFIG.width+24,y:CONFIG.groundY-height,width,height,zombie:isNight(),wobble:Math.random()*Math.PI*2});markHazardSpawn('tube');setNextSpawnDistance();}
function spawnCrate(){state.obstacles.push({type:'crate',x:CONFIG.width+24,y:CONFIG.groundY-34,width:46,height:34});markHazardSpawn('crate');setNextSpawnDistance(CONFIG.hazardMinGap);}
function spawnFridge(){state.obstacles.push({type:'fridge',x:CONFIG.width+24,y:CONFIG.groundY-76,width:42,height:76});markHazardSpawn('fridge');setNextSpawnDistance(CONFIG.tallHazardMinGap);}
function spawnFlyer(){const low=Math.random()<0.55;state.obstacles.push({type:'flyer',x:CONFIG.width+24,y:low?CONFIG.groundY-52:CONFIG.groundY-126,width:46,height:24,phase:Math.random()*Math.PI*2,low});markHazardSpawn('flyer');setNextSpawnDistance(CONFIG.flyingHazardMinGap);}
function spawnHazard(){const fridgeAllowed=state.lastHazardType!=='fridge'&&state.spawnsSinceFridge>=CONFIG.fridgeMinSpawnSeparation;if(fridgeAllowed&&Math.random()<CONFIG.fridgeChance){spawnFridge();return;}const roll=Math.random();if(roll<0.60)spawnTube();else if(roll<0.80)spawnCrate();else spawnFlyer();}
function explode(x,y,color){for(let i=0;i<8;i++)state.particles.push({x,y,vx:rand(-110,110),vy:rand(-150,20),life:rand(0.2,0.45),size:Math.random()<0.5?4:6,color});}
function spark(x,y,color){for(let i=0;i<CONFIG.sparkCount;i++)state.particles.push({x,y,vx:rand(-165,30),vy:rand(-120,120),life:rand(0.1,0.24),size:Math.random()<0.65?3:5,color});}
function gameOver(){state.mode=MODES.GAME_OVER;state.running=false;state.best=Math.max(state.best,Math.floor(state.score));localStorage.setItem('lab8.best',String(state.best));state.flash=0.25;}
function enterBossStage(){state.mode=MODES.BOSS;state.running=true;state.tubes.length=0;state.obstacles.length=0;state.bullets.length=0;state.bossAttacks.length=0;Object.assign(state.boss,{transition:CONFIG.bossTransitionSeconds,phase:'attack',timer:CONFIG.bossAttackSeconds,attackTimer:CONFIG.bossAttackInterval*0.65,weakIndex:0,defeatedWeakPoints:0,victoryTimer:0,hitFlash:0});state.flash=CONFIG.bossTransitionSeconds*0.6;}
function returnToRunner(){state.mode=MODES.RUNNER;state.running=true;state.bossAttacks.length=0;state.bullets.length=0;state.score+=CONFIG.bossVictoryBonus;state.worldDistance=0;state.spawnDistance=CONFIG.tallHazardMinGap;state.lastHazardType='boss';state.spawnsSinceFridge=0;state.flash=0.35;}
function spawnBossAttack(){const destructible=Math.random()<0.56,size=destructible?26:34;state.bossAttacks.push({type:destructible?'destructible':'indestructible',x:CONFIG.width-250,y:CONFIG.groundY-size,width:size,height:size,vx:-(CONFIG.bossAttackSpeed*(0.88+state.speedIndex*0.08)),phase:Math.random()*Math.PI*2});}
function updateGuidoPhysics(dt){guido.runFrame+=dt*(5+state.speedIndex*2);guido.vy+=CONFIG.gravity*dt;guido.y+=guido.vy*dt;const floorY=CONFIG.groundY-guido.height;if(guido.y>=floorY){guido.y=floorY;guido.vy=0;guido.grounded=true;}}

function bossWeakPointRect(index){const ys=[142,200,260];return {x:CONFIG.width-190,y:ys[index]??ys[ys.length-1],width:28,height:24};}
function updateBoss(dt){
 const boss=state.boss;boss.hitFlash=Math.max(0,boss.hitFlash-dt);updateGuidoPhysics(dt);for(const bullet of state.bullets)bullet.x+=bullet.vx*dt;state.bullets=state.bullets.filter((bullet)=>bullet.x<CONFIG.width+30&&bullet.x+bullet.width>-30);
 if(boss.transition>0){boss.transition=Math.max(0,boss.transition-dt);return;}if(boss.phase==='victory'){boss.victoryTimer-=dt;if(boss.victoryTimer<=0)returnToRunner();return;}
 boss.timer-=dt;if(boss.phase==='attack'){boss.attackTimer-=dt;if(boss.attackTimer<=0&&state.bossAttacks.length===0){spawnBossAttack();boss.attackTimer=CONFIG.bossAttackInterval;}if(boss.timer<=0){boss.phase='vulnerable';boss.timer=CONFIG.bossVulnerableSeconds;state.bossAttacks.length=0;}}else if(boss.timer<=0){boss.phase='attack';boss.timer=CONFIG.bossAttackSeconds;boss.attackTimer=CONFIG.bossAttackInterval*0.7;}
 for(const attack of state.bossAttacks){attack.x+=attack.vx*dt;attack.phase+=dt*8;}state.bossAttacks=state.bossAttacks.filter((attack)=>attack.x+attack.width>-30);
 for(let bi=state.bullets.length-1;bi>=0;bi--){const bullet=state.bullets[bi];let consumed=false;for(let ai=state.bossAttacks.length-1;ai>=0;ai--){const attack=state.bossAttacks[ai];if(!rectsOverlap(bullet,attack,1))continue;if(attack.type==='destructible'){explode(attack.x+attack.width/2,attack.y+attack.height/2,palette().hot);state.bossAttacks.splice(ai,1);state.bullets.splice(bi,1);state.score+=CONFIG.tubeScore;}else{bullet.reflected=true;bullet.vx=-CONFIG.bulletSpeed*0.62;bullet.x=attack.x-bullet.width-2;spark(attack.x,bullet.y,palette().hazard);}consumed=true;break;}if(consumed)continue;
  if(boss.phase==='vulnerable'){const weak=bossWeakPointRect(boss.weakIndex);if(rectsOverlap(bullet,weak,0)){state.bullets.splice(bi,1);explode(weak.x+weak.width/2,weak.y+weak.height/2,palette().hazard);boss.hitFlash=0.35;boss.defeatedWeakPoints+=1;state.score+=CONFIG.bossWeakPointScore;if(boss.defeatedWeakPoints>=3){boss.phase='victory';boss.victoryTimer=CONFIG.bossVictorySeconds;state.bossAttacks.length=0;}else{boss.weakIndex+=1;boss.phase='attack';boss.timer=CONFIG.bossAttackSeconds;boss.attackTimer=CONFIG.bossAttackInterval;}}}
 }
 const guidoHitbox={x:guido.x+5,y:guido.y+4,width:guido.width-10,height:guido.height-5};for(const attack of state.bossAttacks){if(rectsOverlap(guidoHitbox,attack,2)){gameOver();break;}}
}

function update(dt){state.flash=Math.max(0,state.flash-dt);guido.shootTimer=Math.max(0,guido.shootTimer-dt);state.particles.forEach((p)=>{p.life-=dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=500*dt;});state.particles=state.particles.filter((p)=>p.life>0);if(state.mode===MODES.GAME_OVER)return;state.elapsed+=dt;state.score+=CONFIG.scorePerSecond*dt*(0.7+state.speedIndex*0.35);if(state.mode===MODES.BOSS){updateBoss(dt);return;}state.worldDistance+=currentSpeed()*dt;updateGuidoPhysics(dt);if(state.worldDistance>=state.spawnDistance)spawnHazard();for(const tube of state.tubes){tube.x-=currentSpeed()*dt;tube.wobble+=dt*7;}for(const obstacle of state.obstacles){obstacle.x-=currentSpeed()*dt;if(obstacle.type==='flyer')obstacle.phase+=dt*8;}for(const bullet of state.bullets)bullet.x+=bullet.vx*dt;state.tubes=state.tubes.filter((tube)=>tube.x+tube.width>-20);state.obstacles=state.obstacles.filter((obstacle)=>obstacle.x+obstacle.width>-30);state.bullets=state.bullets.filter((bullet)=>bullet.x<CONFIG.width+30&&bullet.x+bullet.width>-30);
 for(let bi=state.bullets.length-1;bi>=0;bi--){const bullet=state.bullets[bi];let hit=false;for(let ti=state.tubes.length-1;ti>=0;ti--){const tube=state.tubes[ti];if(rectsOverlap(bullet,tube,1)){const p=palette();explode(tube.x+tube.width/2,tube.y+tube.height/2,p.hot);state.tubes.splice(ti,1);state.bullets.splice(bi,1);state.score+=CONFIG.tubeScore;hit=true;break;}}if(hit)continue;if(!bullet.reflected){for(const obstacle of state.obstacles){if(rectsOverlap(bullet,obstacle,1)){if(obstacle.type==='fridge'){spark(obstacle.x,bullet.y+bullet.height/2,palette().hazard);enterBossStage();return;}bullet.reflected=true;bullet.vx=-CONFIG.bulletSpeed*0.62;bullet.x=obstacle.x-bullet.width-2;spark(obstacle.x,bullet.y+bullet.height/2,palette().hazard);break;}}}}
 const guidoHitbox={x:guido.x+5,y:guido.y+4,width:guido.width-10,height:guido.height-5};for(const tube of state.tubes){if(rectsOverlap(guidoHitbox,tube,2)){gameOver();break;}}if(state.running){for(const obstacle of state.obstacles){if(rectsOverlap(guidoHitbox,obstacle,2)){gameOver();break;}}}
}
function pxRect(x,y,w,h,color){ctx.fillStyle=color;ctx.fillRect(Math.round(x),Math.round(y),Math.round(w),Math.round(h));}
function drawBackground(p){pxRect(0,0,CONFIG.width,CONFIG.height,p.sky);ctx.fillStyle=p.dark;for(let i=0;i<16;i++){const x=(i*83-(state.elapsed*currentSpeed()*0.08))%(CONFIG.width+40),y=30+((i*47)%128);ctx.fillRect(Math.round(x),y,3,3);}ctx.fillStyle=p.mid;const offset=-(state.elapsed*currentSpeed()*0.16)%160;for(let x=offset-160;x<CONFIG.width+160;x+=160){ctx.fillRect(Math.round(x),190,112,72);ctx.fillRect(Math.round(x+12),170,22,20);ctx.fillRect(Math.round(x+58),152,30,38);ctx.fillRect(Math.round(x+96),180,10,10);}pxRect(0,CONFIG.groundY,CONFIG.width,6,p.dark);for(let x=-((state.elapsed*currentSpeed())%32);x<CONFIG.width;x+=32)pxRect(x,CONFIG.groundY+12,18,4,p.mid);}
function drawGuido(p){const x=Math.round(guido.x),y=Math.round(guido.y),step=guido.grounded?Math.floor(guido.runFrame)%2:0;pxRect(x+15,y,4,6,p.hot);pxRect(x+18,y-3,4,4,p.hot);pxRect(x+7,y+6,21,16,p.mid);pxRect(x+4,y+21,26,11,p.dark);pxRect(x+10,y+11,4,4,p.sky);pxRect(x+21,y+11,4,4,p.sky);pxRect(x+28,y+22,9,5,p.hot);if(step===0){pxRect(x+8,y+32,6,6,p.mid);pxRect(x+22,y+32,6,6,p.mid);}else{pxRect(x+5,y+32,9,6,p.mid);pxRect(x+22,y+32,9,6,p.mid);}}
function drawTube(tube,p){const x=Math.round(tube.x),y=Math.round(tube.y+Math.sin(tube.wobble)*(tube.zombie?1.5:0)),glass=tube.zombie?p.hot:p.mid,liquid=tube.zombie?p.mid:p.hot;pxRect(x+6,y,tube.width-12,6,p.dark);pxRect(x+4,y+6,tube.width-8,tube.height-10,glass);pxRect(x+7,y+tube.height-18,tube.width-14,12,liquid);pxRect(x+7,y+tube.height-6,tube.width-14,4,p.dark);if(tube.zombie){pxRect(x+8,y+15,5,4,p.sky);pxRect(x+tube.width-13,y+15,5,4,p.sky);pxRect(x+11,y+26,tube.width-22,4,p.dark);pxRect(x+3,y+24,5,9,p.hot);pxRect(x+tube.width-8,y+21,5,10,p.hot);}}
function drawObstacle(obstacle,p){const x=Math.round(obstacle.x),bob=obstacle.type==='flyer'?Math.sin(obstacle.phase)*2:0,y=Math.round(obstacle.y+bob);if(obstacle.type==='crate'){pxRect(x,y+4,obstacle.width,obstacle.height-4,p.dark);pxRect(x+4,y+8,obstacle.width-8,obstacle.height-12,p.mid);pxRect(x+7,y+11,obstacle.width-14,3,p.dark);pxRect(x+7,y+obstacle.height-9,obstacle.width-14,3,p.dark);const cx=x+Math.floor(obstacle.width/2),cy=y+20;pxRect(cx-3,cy-3,6,6,p.hazard);pxRect(cx-2,cy-11,4,6,p.hazard);pxRect(cx-10,cy+3,6,4,p.hazard);pxRect(cx+4,cy+3,6,4,p.hazard);return;}if(obstacle.type==='fridge'){pxRect(x,y,obstacle.width,obstacle.height,p.dark);pxRect(x+4,y+4,obstacle.width-8,obstacle.height-8,p.mid);pxRect(x+4,y+30,obstacle.width-8,4,p.dark);pxRect(x+obstacle.width-10,y+12,4,13,p.hazard);pxRect(x+obstacle.width-10,y+43,4,18,p.hazard);pxRect(x+7,y+obstacle.height-8,6,8,p.dark);pxRect(x+obstacle.width-13,y+obstacle.height-8,6,8,p.dark);return;}const wingY=y+8;pxRect(x+11,y+6,24,14,p.dark);pxRect(x+15,y+9,16,8,p.mid);pxRect(x+34,y+10,8,5,p.hazard);pxRect(x+2,wingY,12,4,p.hot);pxRect(x+32,wingY,12,4,p.hot);pxRect(x+18,y+2,10,4,p.dark);}

function drawBossBackground(p){
 pxRect(0,0,CONFIG.width,CONFIG.height,p.sky);for(let x=0;x<CONFIG.width;x+=48)pxRect(x,CONFIG.groundY+12,28,4,p.mid);pxRect(0,CONFIG.groundY,CONFIG.width,6,p.dark);
 const bx=CONFIG.width-300,by=40;pxRect(bx,by+70,260,CONFIG.groundY-by-70,p.dark);pxRect(bx+24,by+36,212,34,p.mid);pxRect(bx+58,by+12,144,24,p.dark);pxRect(bx+116,by,28,12,p.hot);for(let row=0;row<4;row++)for(let col=0;col<3;col++)pxRect(bx+34+col*66,by+92+row*42,24,20,p.mid);
 for(let i=0;i<3;i++){const weak=bossWeakPointRect(i),destroyed=i<state.boss.defeatedWeakPoints,open=state.boss.phase==='vulnerable'&&i===state.boss.weakIndex;pxRect(weak.x,weak.y,weak.width,weak.height,destroyed?p.sky:p.mid);if(destroyed){pxRect(weak.x+3,weak.y+3,weak.width-6,weak.height-6,p.dark);pxRect(weak.x+5,weak.y+5,6,4,p.sky);pxRect(weak.x+17,weak.y+13,7,4,p.sky);pxRect(weak.x+12,weak.y+7,3,10,p.sky);pxRect(weak.x+8,weak.y+15,10,3,p.sky);}else if(open){const blink=Math.floor(state.elapsed*10)%2===0;const flashColor=blink?p.hazard:p.hot;pxRect(weak.x-4,weak.y-4,weak.width+8,weak.height+8,flashColor);pxRect(weak.x,weak.y,weak.width,weak.height,p.dark);pxRect(weak.x+4,weak.y+3,weak.width-8,weak.height-6,flashColor);pxRect(weak.x+10,weak.y+8,weak.width-20,weak.height-16,p.sky);}}
}
function drawBossAttack(attack,p){const x=Math.round(attack.x),y=Math.round(attack.y+Math.sin(attack.phase)*1.5);if(attack.type==='destructible'){pxRect(x,y+4,attack.width,attack.height-4,p.hot);pxRect(x+5,y,attack.width-10,5,p.dark);pxRect(x+7,y+9,attack.width-14,attack.height-15,p.mid);}else{pxRect(x,y,attack.width,attack.height,p.dark);pxRect(x+5,y+5,attack.width-10,attack.height-10,p.mid);pxRect(x+9,y+9,attack.width-18,5,p.hazard);}}
function drawBossStatus(p){ctx.fillStyle=p.dark;ctx.font='bold 18px monospace';ctx.textBaseline='top';ctx.fillText(`BOSS NUCLEI ${state.boss.defeatedWeakPoints}/3`,20,64);if(state.boss.phase==='vulnerable'){ctx.fillStyle=p.hazard;ctx.fillText('NUCLEO ESPOSTO!',20,88);ctx.save();ctx.textAlign='center';ctx.textBaseline='top';ctx.font='bold 42px monospace';ctx.lineWidth=8;ctx.strokeStyle=p.dark;ctx.strokeText('FIRE!',CONFIG.width/2,72);ctx.fillStyle=Math.floor(state.elapsed*8)%2===0?p.hazard:p.hot;ctx.fillText('FIRE!',CONFIG.width/2,72);ctx.font='bold 14px monospace';ctx.lineWidth=4;ctx.strokeText('COLPISCI LA FINESTRA LAMPEGGIANTE',CONFIG.width/2,120);ctx.fillStyle=p.sky;ctx.fillText('COLPISCI LA FINESTRA LAMPEGGIANTE',CONFIG.width/2,120);ctx.restore();}}
function drawBossTransition(p){if(state.boss.transition<=0)return;const strength=state.boss.transition/CONFIG.bossTransitionSeconds;for(let y=0;y<CONFIG.height;y+=18)if((y/18)%2===0)pxRect((1-strength)*18,y,CONFIG.width,7,p.hot);}
function drawHud(p){ctx.fillStyle=p.dark;ctx.font='bold 18px monospace';ctx.textBaseline='top';ctx.fillText(`SCORE ${String(Math.floor(state.score)).padStart(6,'0')}`,20,16);ctx.fillText(`BEST ${String(state.best).padStart(6,'0')}`,20,40);const gearNames=['LENTA','NORMALE','VELOCE'],gear=gearNames[state.speedIndex];ctx.textAlign='right';ctx.fillText(`MARCIA ${state.speedIndex+1}/3 ${gear}`,CONFIG.width-20,16);ctx.fillStyle=state.mode===MODES.BOSS?p.hazard:(isNight()?p.hot:p.mid);ctx.fillText(state.mode===MODES.BOSS?'BOSS // PALAZZO':(isNight()?'NOTTE // ZOMBIE':'GIORNO // LAB'),CONFIG.width-20,40);ctx.textAlign='left';}
function drawOverlay(p){if(state.mode!==MODES.GAME_OVER)return;ctx.fillStyle=`${p.sky}dd`;ctx.fillRect(180,108,600,140);ctx.strokeStyle=p.dark;ctx.lineWidth=4;ctx.strokeRect(180,108,600,140);ctx.fillStyle=p.dark;ctx.textAlign='center';ctx.font='bold 34px monospace';ctx.fillText('CONTAMINAZIONE!',CONFIG.width/2,138);ctx.font='bold 18px monospace';ctx.fillText(`PUNTEGGIO ${Math.floor(state.score)}  //  BEST ${state.best}`,CONFIG.width/2,185);ctx.font='16px monospace';ctx.fillText('R / INVIO / TAP PER RIPARTIRE',CONFIG.width/2,218);ctx.textAlign='left';}
function render(){const p=palette();if(state.mode===MODES.BOSS){drawBossBackground(p);for(const attack of state.bossAttacks)drawBossAttack(attack,p);}else{drawBackground(p);for(const tube of state.tubes)drawTube(tube,p);for(const obstacle of state.obstacles)drawObstacle(obstacle,p);}for(const bullet of state.bullets){pxRect(bullet.x,bullet.y,bullet.width,bullet.height,p.hot);pxRect(bullet.x+bullet.width,bullet.y+1,4,2,p.dark);}for(const particle of state.particles)pxRect(particle.x,particle.y,particle.size,particle.size,particle.color);drawGuido(p);drawHud(p);if(state.mode===MODES.BOSS){drawBossStatus(p);drawBossTransition(p);if(state.boss.hitFlash>0){ctx.globalAlpha=Math.min(1,state.boss.hitFlash*3);pxRect(CONFIG.width-320,28,290,CONFIG.groundY-28,p.hazard);ctx.globalAlpha=1;}if(state.boss.phase==='victory'){ctx.fillStyle=p.hazard;ctx.textAlign='center';ctx.font='bold 30px monospace';ctx.fillText('PALAZZO DISTRUTTO!',CONFIG.width/2,92);ctx.textAlign='left';for(let i=0;i<20;i++){const fall=((CONFIG.bossVictorySeconds-state.boss.victoryTimer)*90+i*17)%180;pxRect(CONFIG.width-300+(i*37)%260,95+fall,7,7,i%2?p.hot:p.hazard);}}}drawOverlay(p);if(state.flash>0){ctx.globalAlpha=state.flash*2.5;ctx.fillStyle=p.hot;ctx.fillRect(0,0,CONFIG.width,CONFIG.height);ctx.globalAlpha=1;}}
let lastTime=performance.now();function loop(now){const dt=Math.min(CONFIG.maxDelta,(now-lastTime)/1000);lastTime=now;update(dt);render();requestAnimationFrame(loop);}canvas.focus();requestAnimationFrame(loop);
if('serviceWorker'in navigator)window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').catch((error)=>console.warn('LAB-8 service worker non disponibile:',error)));
