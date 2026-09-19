const canvas = document.querySelector('#game');
const ctx = canvas.getContext('2d');
ctx.imageSmoothingEnabled = false;

const W = canvas.width;
const H = canvas.height;
const GROUND_Y = 302;
const MODES = Object.freeze({ RUNNER:'RUNNER', BOSS:'BOSS', LEVEL_COMPLETE:'LEVEL_COMPLETE', GAME_COMPLETE:'GAME_COMPLETE', GAME_OVER:'GAME_OVER' });
const BASE_SPEEDS = [190,280,390];
const BULLET_SPEED = 610;
const SHOOT_COOLDOWN = 0.22;
const SCORE_RATE = 12;
const MAX_DT = 1/20;
const campaign = globalThis.Lab8Campaign.createCampaignState();

const state = {
  mode: MODES.RUNNER,
  running: true,
  score: 0,
  best: Number(localStorage.getItem('lab8.best') || 0),
  elapsed: 0,
  speedIndex: globalThis.Lab8Settings?.initialSpeedIndex?.() ?? 1,
  levelDistance: 0,
  spawnDistance: 340,
  hazards: [],
  bullets: [],
  particles: [],
  pickups: [],
  flash: 0,
  transition: 1.2,
  boss: null,
};

const guido = { x:126, y:GROUND_Y-38, width:34, height:38, vy:0, grounded:true, shootTimer:0, runFrame:0 };

function level(){ return globalThis.Lab8Levels.get(campaign.levelIndex); }
function levelProgressScore(){ return state.score - campaign.levelScoreStart; }
function isNight(){ return Math.floor(state.elapsed / 18) % 2 === 1; }
function palette(){ return isNight() ? level().nightPalette : level().palette; }
function currentSpeed(){ return BASE_SPEEDS[state.speedIndex] * level().speedMultiplier; }
function rand(min,max){ return min + Math.random()*(max-min); }
function overlap(a,b,inset=0){ return a.x+inset < b.x+b.width-inset && a.x+a.width-inset > b.x+inset && a.y+inset < b.y+b.height-inset && a.y+a.height-inset > b.y+inset; }
function clearAction(){ state.hazards.length=0; state.bullets.length=0; state.pickups.length=0; }
function resetGuido(){ guido.y=GROUND_Y-guido.height; guido.vy=0; guido.grounded=true; guido.shootTimer=0; }
function emit(x,y,color,count=8){ for(let i=0;i<count;i++) state.particles.push({x,y,vx:rand(-120,120),vy:rand(-150,20),life:rand(.18,.5),size:Math.random()<.5?4:6,color}); }
function play(name){ globalThis.Lab8Audio?.play?.(name); }

function resetGame(){
  const fresh = globalThis.Lab8Campaign.createCampaignState();
  Object.assign(campaign,fresh);
  state.mode=MODES.RUNNER; state.running=true; state.score=0; state.elapsed=0; state.levelDistance=0; state.spawnDistance=340;
  state.speedIndex=globalThis.Lab8Settings?.initialSpeedIndex?.() ?? 1; state.flash=.25; state.transition=1.2; state.boss=null;
  clearAction(); state.particles.length=0; resetGuido(); play('restart');
}

function jump(){
  if([MODES.GAME_OVER,MODES.GAME_COMPLETE,MODES.LEVEL_COMPLETE].includes(state.mode)) return;
  if(guido.grounded){ guido.vy=level().physics.jumpVelocity; guido.grounded=false; play('jump'); }
}
function shoot(){
  if([MODES.GAME_OVER,MODES.GAME_COMPLETE,MODES.LEVEL_COMPLETE].includes(state.mode) || guido.shootTimer>0) return;
  guido.shootTimer=SHOOT_COOLDOWN;
  state.bullets.push({x:guido.x+guido.width-2,y:guido.y+15,width:10,height:4,vx:BULLET_SPEED,reflected:false});
  play('shoot');
}
function changeSpeed(dir){ const before=state.speedIndex; state.speedIndex=Math.max(0,Math.min(2,state.speedIndex+dir)); if(before!==state.speedIndex) play(dir>0?'gear-up':'gear-down'); }
function handleAction(action){
  if((state.mode===MODES.GAME_OVER || state.mode===MODES.GAME_COMPLETE) && (action==='jump'||action==='shoot')) return resetGame();
  if(state.mode===MODES.LEVEL_COMPLETE && (action==='jump'||action==='shoot')) return startNextLevel();
  if(action==='jump') jump(); else if(action==='shoot') shoot(); else if(action==='slower') changeSpeed(-1); else if(action==='faster') changeSpeed(1);
}

window.addEventListener('keydown',(e)=>{ const k=e.key.toLowerCase(); if([' ','arrowup','w','x','f','+','=','-','_','r','enter'].includes(k)) e.preventDefault(); if(k===' '||k==='arrowup'||k==='w')handleAction('jump'); else if(k==='x'||k==='f')handleAction('shoot'); else if(k==='+'||k==='=')handleAction('faster'); else if(k==='-'||k==='_')handleAction('slower'); else if((k==='r'||k==='enter')&&!state.running) resetGame(); });
document.querySelectorAll('[data-action]').forEach((button)=>{ const release=(e)=>{e?.preventDefault();button.classList.remove('is-pressed');}; button.addEventListener('pointerdown',(e)=>{e.preventDefault();button.classList.add('is-pressed');handleAction(button.dataset.action);}); button.addEventListener('pointerup',release); button.addEventListener('pointercancel',release); });
canvas.addEventListener('pointerdown',(e)=>{ e.preventDefault(); if(state.mode===MODES.GAME_OVER||state.mode===MODES.GAME_COMPLETE) resetGame(); else if(state.mode===MODES.LEVEL_COMPLETE) startNextLevel(); else jump(); });

function updatePhysics(dt){
  guido.runFrame += dt*(5+state.speedIndex*2);
  guido.vy += level().physics.gravity*dt;
  guido.y += guido.vy*dt;
  const floor=GROUND_Y-guido.height;
  if(guido.y>=floor){guido.y=floor;guido.vy=0;guido.grounded=true;}
}

const HAZARD_VISUALS = {
  lab:['tube','crate','fridge','flyer'], home:['toast','chair','vacuum','lamp'], underwater:['jelly','mine','puffer','torpedo'], mars:['rock','rover','meteor','ufo']
};
function makeHazard(){
  const lvl=level(); const types=HAZARD_VISUALS[lvl.id]||lvl.hazards; const type=types[Math.floor(Math.random()*types.length)];
  const flying=['flyer','lamp','jelly','torpedo','meteor','ufo'].includes(type);
  const destructible=['tube','toast','lamp','jelly','puffer','meteor'].includes(type);
  const tall=['fridge','chair','rover'].includes(type);
  const width=flying?44:(tall?42:36), height=flying?24:(tall?62:36);
  const low=flying && Math.random()<.6;
  const y=flying ? (low?GROUND_Y-58:GROUND_Y-130) : GROUND_Y-height;
  const requested=rand(lvl.hazardSpeed[0],lvl.hazardSpeed[1]);
  const multiplier=globalThis.Lab8Campaign.clampHazardSpeed(lvl,requested);
  return {type,x:W+30,y,width,height,destructible,counter:destructible?'shoot':(flying&&!low?'duck':'jump'),vx:-currentSpeed()*multiplier,phase:Math.random()*Math.PI*2,low};
}
function scheduleSpawn(){ const [min,max]=level().hazardGap; state.spawnDistance=rand(min,max); state.levelDistance=0; }
function spawnHazard(){
  let hazard=makeHazard();
  if(!globalThis.Lab8Campaign.hazardReachable(level(),hazard,currentSpeed())){
    hazard={type:'safe-crate',x:W+30,y:GROUND_Y-30,width:34,height:30,destructible:true,counter:'shoot',vx:-currentSpeed(),phase:0,low:true};
  }
  state.hazards.push(hazard); scheduleSpawn();
  if(Math.random()<.06 && campaign.lives<globalThis.Lab8Campaign.MAX_LIVES) state.pickups.push({x:W+110,y:GROUND_Y-92,width:24,height:24,vx:-currentSpeed()*.9,phase:0});
}

function loseLife(){
  const result=globalThis.Lab8Campaign.loseLife(campaign); if(!result.lost) return;
  play('game-over'); state.flash=.35; clearAction(); resetGuido();
  if(result.gameOver){ state.mode=MODES.GAME_OVER; state.running=false; state.best=Math.max(state.best,Math.floor(state.score)); localStorage.setItem('lab8.best',String(state.best)); globalThis.Lab8Leaderboard?.recordScore?.(Math.floor(state.score),`${Date.now()}-${Math.floor(state.score)}`); }
}
function gainLife(){ if(globalThis.Lab8Campaign.gainLife(campaign)){ state.flash=.18; emit(guido.x+17,guido.y,palette().hazard,12); play('weak-hit'); } }

function enterBossStage(){
  state.mode=MODES.BOSS; clearAction(); resetGuido();
  state.boss={type:level().bossType,phase:'attack',timer:3.0,attackTimer:.7,hp:3,weakOpen:false,hitFlash:0,victoryTimer:0};
  state.transition=.8; play('boss-enter');
}
function alienBossOffset(){ return ['alien','alien-ship'].includes(state.boss?.type) ? Math.sin(state.elapsed*3.2)*45 : 0; }
function bossTarget(){
  if(state.boss.type==='alien'||state.boss.type==='alien-ship') return {x:W-190,y:132+alienBossOffset(),width:86,height:58};
  if(state.boss.type==='octopus') return {x:W-210,y:120,width:74,height:58};
  return {x:W-190,y:170,width:36,height:84};
}
function spawnBossAttack(){
  const speed=rand(level().hazardSpeed[0],level().hazardSpeed[1]);
  if(state.boss.type==='octopus'){
    const high=Math.random()<.45;
    const size=high?30:38;
    state.hazards.push({type:'tentacle',x:W-250,y:high?GROUND_Y-128:GROUND_Y-size,width:size,height:size,destructible:false,counter:high?'duck':'jump',vx:-300*speed,phase:0,low:!high});
  } else if(state.boss.type==='alien-ship'){
    const high=Math.random()<.5;
    state.hazards.push({type:'rocket',x:W-230,y:high?GROUND_Y-132:GROUND_Y-42,width:42,height:18,destructible:true,counter:'shoot',vx:-390*speed,phase:0,low:!high});
  } else {
    const destructible=Math.random()<.58; const high=Math.random()<.25; const size=destructible?26:34;
    state.hazards.push({type:destructible?'boss-breakable':'boss-solid',x:W-245,y:high?GROUND_Y-126:GROUND_Y-size,width:size,height:size,destructible,counter:destructible?'shoot':(high?'duck':'jump'),vx:-330*speed,phase:0,low:!high});
  }
  play('boss-attack');
}
function finishBoss(){ state.boss.phase='victory'; state.boss.victoryTimer=1.8; clearAction(); state.score+=1800; play('victory'); }
function finishLevel(){
  if(campaign.levelIndex+1>=globalThis.Lab8Levels.count){ campaign.completed=true; state.mode=MODES.GAME_COMPLETE; state.running=false; state.best=Math.max(state.best,Math.floor(state.score)); localStorage.setItem('lab8.best',String(state.best)); globalThis.Lab8Leaderboard?.recordScore?.(Math.floor(state.score),`${Date.now()}-${Math.floor(state.score)}`); }
  else { state.mode=MODES.LEVEL_COMPLETE; state.running=false; state.transition=0; }
}
function startNextLevel(){
  const advanced=globalThis.Lab8Campaign.advanceLevel(campaign,globalThis.Lab8Levels.count,state.score);
  if(!advanced) return finishLevel();
  state.mode=MODES.RUNNER; state.running=true; state.levelDistance=0; state.spawnDistance=360; state.transition=1.4; state.boss=null; clearAction(); resetGuido();
}

function updateBoss(dt){
  const b=state.boss; b.hitFlash=Math.max(0,b.hitFlash-dt); updatePhysics(dt);
  if(state.transition>0){state.transition=Math.max(0,state.transition-dt);return;}
  if(b.phase==='victory'){ b.victoryTimer-=dt; if(b.victoryTimer<=0) finishLevel(); return; }
  b.timer-=dt;
  if(b.phase==='attack'){
    b.attackTimer-=dt; if(b.attackTimer<=0 && state.hazards.length===0){spawnBossAttack(); b.attackTimer=.9;}
    if(b.timer<=0){b.phase='vulnerable';b.timer=1.7;b.weakOpen=true;state.hazards.length=0;}
  } else if(b.timer<=0){b.phase='attack';b.timer=3.0;b.attackTimer=.65;b.weakOpen=false;}

  for(const h of state.hazards){h.x+=h.vx*dt;h.phase+=dt*7;}
  for(const bullet of state.bullets) bullet.x+=bullet.vx*dt;
  state.hazards=state.hazards.filter(h=>h.x+h.width>-30); state.bullets=state.bullets.filter(b=>b.x<W+30&&b.x+b.width>-30);

  for(let bi=state.bullets.length-1;bi>=0;bi--){ const bullet=state.bullets[bi]; let used=false;
    for(let hi=state.hazards.length-1;hi>=0;hi--){ const h=state.hazards[hi]; if(!overlap(bullet,h,1))continue; if(h.destructible){emit(h.x,h.y,palette().hot);state.hazards.splice(hi,1);state.bullets.splice(bi,1);state.score+=80;play('destroy');}else{bullet.reflected=true;bullet.vx=-BULLET_SPEED*.6;bullet.x=h.x-bullet.width-2;play('ricochet');} used=true;break; }
    if(used)continue;
    if(b.phase==='vulnerable'&&b.weakOpen&&overlap(bullet,bossTarget(),0)){state.bullets.splice(bi,1);b.hp--;b.hitFlash=.35;b.weakOpen=false;state.score+=350;emit(W-150,bossTarget().y+35,palette().hazard,16);play('weak-hit');if(b.hp<=0)finishBoss();else{b.phase='attack';b.timer=2.6;b.attackTimer=.8;}}
  }
  const hit={x:guido.x+5,y:guido.y+4,width:guido.width-10,height:guido.height-5}; for(const h of state.hazards) if(overlap(hit,h,2)){loseLife();break;}
}

function updateRunner(dt){
  updatePhysics(dt); state.levelDistance+=currentSpeed()*dt;
  if(levelProgressScore()>=level().bossAfterScore){enterBossStage();return;}
  if(state.levelDistance>=state.spawnDistance && state.hazards.length===0) spawnHazard();
  for(const h of state.hazards){h.x+=h.vx*dt;h.phase+=dt*7;}
  for(const p of state.pickups){p.x+=p.vx*dt;p.phase+=dt*5;}
  for(const b of state.bullets)b.x+=b.vx*dt;
  state.hazards=state.hazards.filter(h=>h.x+h.width>-30); state.pickups=state.pickups.filter(p=>p.x+p.width>-30); state.bullets=state.bullets.filter(b=>b.x<W+30&&b.x+b.width>-30);
  for(let bi=state.bullets.length-1;bi>=0;bi--){const b=state.bullets[bi];for(let hi=state.hazards.length-1;hi>=0;hi--){const h=state.hazards[hi];if(!overlap(b,h,1))continue;if(h.destructible){emit(h.x,h.y,palette().hot);state.hazards.splice(hi,1);state.bullets.splice(bi,1);state.score+=80;play('destroy');}else{b.reflected=true;b.vx=-BULLET_SPEED*.6;b.x=h.x-b.width-2;play('ricochet');}break;}}
  const hit={x:guido.x+5,y:guido.y+4,width:guido.width-10,height:guido.height-5};
  if(campaign.invulnerable<=0) for(const h of state.hazards) if(overlap(hit,h,2)){loseLife();break;}
  for(let i=state.pickups.length-1;i>=0;i--) if(overlap(hit,state.pickups[i],2)){state.pickups.splice(i,1);gainLife();}
}

function update(dt){
  if(globalThis.Lab8Pin?.blocksGameplay?.()||globalThis.Lab8Settings?.blocksGameplay?.()||globalThis.Lab8Leaderboard?.blocksGameplay?.())return;
  state.flash=Math.max(0,state.flash-dt); state.transition=Math.max(0,state.transition-dt); guido.shootTimer=Math.max(0,guido.shootTimer-dt); campaign.invulnerable=Math.max(0,campaign.invulnerable-dt);
  for(const p of state.particles){p.life-=dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=500*dt;} state.particles=state.particles.filter(p=>p.life>0);
  if(!state.running && ![MODES.LEVEL_COMPLETE].includes(state.mode)) return;
  if(state.mode===MODES.LEVEL_COMPLETE)return;
  state.elapsed+=dt; state.score+=SCORE_RATE*dt*(.7+state.speedIndex*.35);
  if(state.mode===MODES.BOSS)updateBoss(dt); else if(state.mode===MODES.RUNNER)updateRunner(dt);
}

function rect(x,y,w,h,c){ctx.fillStyle=c;ctx.fillRect(Math.round(x),Math.round(y),Math.round(w),Math.round(h));}
function drawEnvironment(p){
  rect(0,0,W,H,p.sky); const id=level().id;
  if(id==='lab'){
    for(let x=-((state.elapsed*currentSpeed()*.15)%160)-160;x<W+160;x+=160){rect(x,190,112,72,p.mid);rect(x+18,158,24,32,p.dark);rect(x+70,170,32,20,p.hot);}
  } else if(id==='home'){
    rect(0,195,W,107,p.mid); for(let x=-((state.elapsed*currentSpeed()*.12)%190)-190;x<W+190;x+=190){rect(x,105,130,90,p.dark);rect(x+15,125,42,38,p.sky);rect(x+78,135,35,60,p.hot);}
  } else if(id==='underwater'){
    for(let i=0;i<24;i++){const x=(i*61-state.elapsed*35)%(W+40);const y=40+(i*37)%220;rect(x,y,5,5,p.hazard);} for(let x=0;x<W;x+=90){rect(x,260,70,42,p.mid);}
  } else {
    for(let i=0;i<30;i++){const x=(i*97-state.elapsed*18)%(W+60);const y=30+(i*43)%180;rect(x,y,3,3,p.hazard);} for(let x=-((state.elapsed*currentSpeed()*.1)%150)-150;x<W+150;x+=150){rect(x,245,110,57,p.mid);rect(x+35,220,45,25,p.dark);}
  }
  rect(0,GROUND_Y,W,6,p.dark); for(let x=-((state.elapsed*currentSpeed())%32);x<W;x+=32)rect(x,GROUND_Y+12,18,4,p.mid);
}
function drawGuido(p){const x=guido.x,y=guido.y;const blink=campaign.invulnerable>0&&Math.floor(campaign.invulnerable*10)%2===0;if(blink)return;rect(x+7,y+6,21,16,p.mid);rect(x+4,y+21,26,11,p.dark);rect(x+10,y+11,4,4,p.sky);rect(x+21,y+11,4,4,p.sky);rect(x+28,y+22,9,5,p.hot);rect(x+9,y+32,6,6,p.mid);rect(x+22,y+32,6,6,p.mid);}
function drawHazard(h,p){
  const x=Math.round(h.x),y=Math.round(h.y+Math.sin(h.phase||0)*1.5),w=h.width,hh=h.height;
  const px=(dx,dy,dw,dh,c)=>rect(x+dx,y+dy,dw,dh,c);
  switch(h.type){
    case 'tube':
      px(10,0,w-20,5,p.sky);px(7,5,w-14,hh-9,p.dark);px(10,hh-18,w-20,14,p.hot);px(12,hh-15,w-24,4,p.hazard);break;
    case 'potion': case 'potion-armored':
      px(14,0,16,7,p.dark);px(10,7,24,6,p.mid);px(5,13,34,hh-13,h.destructible?p.hot:p.dark);px(10,18,24,hh-23,p.mid);px(14,21,8,6,p.hazard);break;
    case 'television':
      px(2,5,w-4,hh-10,p.dark);px(7,10,w-14,hh-22,p.sky);px(11,14,w-22,hh-30,p.hot);px(7,hh-5,7,5,p.dark);px(w-14,hh-5,7,5,p.dark);break;
    case 'wardrobe':
      px(2,0,w-4,hh,p.dark);px(6,5,w/2-7,hh-10,p.mid);px(w/2+1,5,w/2-7,hh-10,p.mid);px(w/2-5,hh/2,3,3,p.hazard);px(w/2+3,hh/2,3,3,p.hazard);break;
    case 'pan': case 'pan-armored':
      px(0,8,w-13,hh-10,h.destructible?p.mid:p.dark);px(5,12,w-23,hh-18,p.hot);px(w-14,hh/2-2,14,5,p.dark);break;
    case 'baby-octopus':
      px(7,0,w-14,18,p.mid);px(3,8,w-6,17,p.dark);px(9,9,5,5,p.sky);px(w-14,9,5,5,p.sky);for(let i=0;i<4;i++)px(4+i*8,23,5,hh-23,p.mid);break;
    case 'flying-fish': case 'flying-fish-armored':
      px(7,5,w-15,hh-10,h.destructible?p.mid:p.dark);px(0,9,10,hh-18,p.hot);px(w-13,8,10,hh-16,p.mid);px(w-12,9,3,3,p.sky);break;
    case 'alien': case 'alien-armored':
      px(8,0,w-16,12,h.destructible?p.mid:p.dark);px(4,8,w-8,18,p.dark);px(9,11,5,5,p.hazard);px(w-14,11,5,5,p.hazard);px(8,26,7,hh-26,p.mid);px(w-15,26,7,hh-26,p.mid);break;
    case 'spaceship': case 'spaceship-armored':
      px(10,0,w-20,7,p.mid);px(3,7,w-6,10,h.destructible?p.mid:p.dark);px(0,13,w,7,p.dark);px(8,17,7,5,p.hot);px(w-15,17,7,5,p.hot);break;
    case 'fridge':
      px(2,0,w-4,hh,p.dark);px(6,5,w-12,hh-10,p.sky);px(8,hh*.43,w-16,4,p.dark);px(w-11,12,3,14,p.hot);px(w-11,hh*.55,3,12,p.hot);break;
    default:
      if(h.destructible){px(0,0,w,hh,p.hot);px(5,5,w-10,hh-10,p.mid);}else{px(0,0,w,hh,p.dark);px(5,5,w-10,hh-10,p.mid);}
  }
  if(!h.destructible && !['fridge','tentacle','boss-solid'].includes(h.type)) { px(1,1,5,5,p.hazard); px(w-6,1,5,5,p.hazard); }
}
function drawPickup(pick,p){const y=pick.y+Math.sin(pick.phase)*5;rect(pick.x,y,pick.width,pick.height,p.hazard);rect(pick.x+5,y+5,14,14,p.hot);rect(pick.x+9,y+2,6,20,p.sky);rect(pick.x+2,y+9,20,6,p.sky);}
function drawBoss(p){
  if(state.boss.type==='alien'||state.boss.type==='alien-ship'){
    const x=W-265,y=92+alienBossOffset();
    rect(x+70,y,110,28,p.mid);rect(x+35,y+28,180,54,p.dark);rect(x+60,y+48,130,42,p.mid);
    rect(x+86,y+58,22,12,p.hazard);rect(x+142,y+58,22,12,p.hazard);rect(x+102,y+76,50,8,p.hot);
    rect(x+10,y+54,48,18,p.dark);rect(x+192,y+54,48,18,p.dark);rect(x+20,y+76,28,8,p.hot);rect(x+202,y+76,28,8,p.hot);
  } else if(state.boss.type==='octopus'){
    const x=W-270,y=82;
    rect(x+92,y,94,64,p.mid);rect(x+72,y+18,134,78,p.dark);rect(x+92,y+34,94,44,p.mid);
    rect(x+112,y+44,14,12,p.hazard);rect(x+152,y+44,14,12,p.hazard);rect(x+128,y+66,24,8,p.hot);
    for(let i=0;i<6;i++){const tx=x+58+i*28;const wave=Math.sin(state.elapsed*4+i)*12;rect(tx,y+92,18,74+wave,p.mid);rect(tx+4,y+150+wave,10,40,p.dark);}
  } else {
    const x=W-290,y=45;rect(x,y+65,250,GROUND_Y-y-65,p.dark);rect(x+25,y+35,200,30,p.mid);for(let r=0;r<4;r++)for(let c=0;c<3;c++)rect(x+35+c*65,y+95+r*42,24,20,p.mid);
  }
  if(state.boss.phase==='vulnerable'&&state.boss.weakOpen){const t=bossTarget();rect(t.x-6,t.y-6,t.width+12,t.height+12,p.hazard);rect(t.x,t.y,t.width,t.height,p.hot);}
}
function drawHud(p){ctx.fillStyle=p.dark;ctx.font='bold 18px monospace';ctx.textBaseline='top';ctx.fillText(`SCORE ${String(Math.floor(state.score)).padStart(6,'0')}`,20,16);ctx.fillText(`VITE ${'♥'.repeat(campaign.lives)}${'·'.repeat(globalThis.Lab8Campaign.MAX_LIVES-campaign.lives)}`,20,40);ctx.textAlign='right';ctx.fillText(`LIVELLO ${campaign.levelIndex+1}/4 // ${level().name}`,W-20,16);ctx.fillText(`MARCIA ${state.speedIndex+1}/3`,W-20,40);ctx.textAlign='left';}
function drawCentered(title,sub,p){ctx.fillStyle=`${p.sky}ee`;ctx.fillRect(150,105,660,150);ctx.strokeStyle=p.dark;ctx.lineWidth=4;ctx.strokeRect(150,105,660,150);ctx.fillStyle=p.dark;ctx.textAlign='center';ctx.font='bold 30px monospace';ctx.fillText(title,W/2,142);ctx.font='16px monospace';ctx.fillText(sub,W/2,188);ctx.textAlign='left';}
function render(){const p=palette();drawEnvironment(p);if(state.mode===MODES.BOSS)drawBoss(p);for(const h of state.hazards)drawHazard(h,p);for(const q of state.pickups)drawPickup(q,p);for(const b of state.bullets){rect(b.x,b.y,b.width,b.height,p.hot);rect(b.x+b.width,b.y+1,4,2,p.dark);}for(const part of state.particles)rect(part.x,part.y,part.size,part.size,part.color);drawGuido(p);drawHud(p);
  if(state.transition>0 && state.mode!==MODES.BOSS)drawCentered(`LIVELLO ${campaign.levelIndex+1} // ${level().name}`,level().subtitle,p);
  if(state.mode===MODES.BOSS){ctx.fillStyle=p.hazard;ctx.font='bold 18px monospace';const bossName=state.boss.type==='alien'?'ALIENO GIGANTE':state.boss.type==='alien-ship'?'ASTRONAVE ALIENA':state.boss.type==='octopus'?'POLIPO ABISSALE':'MEGA PALAZZO';ctx.fillText(`${bossName} // HP ${state.boss.hp}/3`,20,66);if(state.boss.phase==='vulnerable'){ctx.font='bold 34px monospace';ctx.textAlign='center';ctx.fillText('FIRE!',W/2,78);ctx.textAlign='left';}}
  if(state.mode===MODES.LEVEL_COMPLETE)drawCentered(`${level().name} COMPLETATO!`,'TAP / SPAZIO PER IL PROSSIMO LIVELLO',p);
  if(state.mode===MODES.GAME_COMPLETE)drawCentered('MISSIONE COMPLETATA!','HAI SUPERATO I 4 MONDI DI LAB-8',p);
  if(state.mode===MODES.GAME_OVER)drawCentered('GAME OVER',`PUNTEGGIO ${Math.floor(state.score)} // TAP PER RIPARTIRE`,p);
  if(state.flash>0){ctx.globalAlpha=Math.min(.8,state.flash*2);rect(0,0,W,H,p.hot);ctx.globalAlpha=1;}
}

let last=performance.now(); function loop(now){const dt=Math.min(MAX_DT,(now-last)/1000);last=now;update(dt);render();requestAnimationFrame(loop);} canvas.focus({preventScroll:true});requestAnimationFrame(loop);

globalThis.Lab8Game={applyInitialSpeed(index){if(state.mode===MODES.RUNNER&&state.score===0)state.speedIndex=Math.max(0,Math.min(2,Number(index)));},_test:{state,campaign,guido,level,makeHazard,loseLife,enterBossStage,startNextLevel}};
