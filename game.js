const canvas = document.querySelector('#game');
const ctx = canvas.getContext('2d');
ctx.imageSmoothingEnabled = false;

const CONFIG = Object.freeze({
  width: canvas.width,
  height: canvas.height,
  groundY: 302,
  gravity: 1850,
  jumpVelocity: -690,
  speeds: [190, 280, 390],
  initialSpeedIndex: 1,
  obstacleMinGap: 285,
  obstacleMaxGap: 500,
  bulletSpeed: 610,
  bulletBounceSpeed: 330,
  bulletBounceLife: 0.38,
  shootCooldown: 0.22,
  dayNightSeconds: 18,
  scorePerSecond: 12,
  tubeScore: 80,
  maxDelta: 1 / 20
});

const PALETTES = {
  day: { sky: '#d8f3dc', dark: '#16324f', mid: '#2d6a4f', hot: '#f4a261', warning: '#ffd60a' },
  night: { sky: '#10233c', dark: '#f1fa8c', mid: '#ffb703', hot: '#ff4d6d', warning: '#ffd60a' }
};

const state = {
  running: true,
  score: 0,
  best: Number(localStorage.getItem('lab8.best') || 0),
  elapsed: 0,
  speedIndex: CONFIG.initialSpeedIndex,
  spawnDistance: 330,
  worldDistance: 0,
  obstacles: [],
  bullets: [],
  particles: [],
  flash: 0,
  lastObstacleType: null
};

const guido = { x: 126, y: CONFIG.groundY - 38, width: 34, height: 38, vy: 0, grounded: true, shootTimer: 0, runFrame: 0 };
const isNight = () => Math.floor(state.elapsed / CONFIG.dayNightSeconds) % 2 === 1;
const palette = () => isNight() ? PALETTES.night : PALETTES.day;
const currentSpeed = () => CONFIG.speeds[state.speedIndex];
const rand = (a, b) => a + Math.random() * (b - a);
const pick = values => values[Math.floor(Math.random() * values.length)];

function rectsOverlap(a, b, inset = 0) {
  return a.x + inset < b.x + b.width - inset &&
    a.x + a.width - inset > b.x + inset &&
    a.y + inset < b.y + b.height - inset &&
    a.y + a.height - inset > b.y + inset;
}

function resetGame() {
  Object.assign(state, {
    running: true,
    score: 0,
    elapsed: 0,
    speedIndex: CONFIG.initialSpeedIndex,
    spawnDistance: 330,
    worldDistance: 0,
    flash: 0,
    lastObstacleType: null
  });
  state.obstacles.length = state.bullets.length = state.particles.length = 0;
  Object.assign(guido, { y: CONFIG.groundY - guido.height, vy: 0, grounded: true, shootTimer: 0 });
}

function jump() {
  if (state.running && guido.grounded) {
    guido.vy = CONFIG.jumpVelocity;
    guido.grounded = false;
  }
}

function shoot() {
  if (!state.running || guido.shootTimer > 0) return;
  guido.shootTimer = CONFIG.shootCooldown;
  state.bullets.push({ x: guido.x + guido.width - 2, y: guido.y + 15, width: 10, height: 4, vx: CONFIG.bulletSpeed, vy: 0, life: 2 });
}

function changeSpeed(delta) {
  state.speedIndex = Math.max(0, Math.min(CONFIG.speeds.length - 1, state.speedIndex + delta));
}

function handleAction(action) {
  if (!state.running && (action === 'jump' || action === 'shoot')) {
    resetGame();
    return;
  }
  if (action === 'jump') jump();
  if (action === 'shoot') shoot();
  if (action === 'slower') changeSpeed(-1);
  if (action === 'faster') changeSpeed(1);
}

window.addEventListener('keydown', event => {
  const key = event.key.toLowerCase();
  if ([' ', 'arrowup', 'w', 'x', 'f', '+', '=', '-', '_', 'r', 'enter'].includes(key)) event.preventDefault();
  if (key === ' ' || key === 'arrowup' || key === 'w') handleAction('jump');
  else if (key === 'x' || key === 'f') handleAction('shoot');
  else if (key === '+' || key === '=') handleAction('faster');
  else if (key === '-' || key === '_') handleAction('slower');
  else if ((key === 'r' || key === 'enter') && !state.running) resetGame();
});

function bindPressAction(button) {
  const release = event => {
    if (event) event.preventDefault();
    button.classList.remove('is-pressed');
  };
  button.addEventListener('pointerdown', event => {
    event.preventDefault();
    button.classList.add('is-pressed');
    if (button.setPointerCapture) {
      try { button.setPointerCapture(event.pointerId); } catch {}
    }
    handleAction(button.dataset.action);
  });
  button.addEventListener('pointerup', release);
  button.addEventListener('pointercancel', release);
  button.addEventListener('lostpointercapture', release);
  button.addEventListener('contextmenu', event => event.preventDefault());
}

document.querySelectorAll('[data-action]').forEach(bindPressAction);
canvas.addEventListener('pointerdown', event => {
  event.preventDefault();
  if (!state.running) resetGame();
  else jump();
});
canvas.addEventListener('contextmenu', event => event.preventDefault());
['touchstart', 'touchmove', 'gesturestart', 'gesturechange'].forEach(name => document.addEventListener(name, event => {
  if (event.target.closest?.('.game-frame')) event.preventDefault();
}, { passive: false }));

function spawnObstacle() {
  const weights = ['tube', 'tube', 'tube', 'crate', 'fridge', 'flyer'];
  let type = pick(weights);

  if ((state.lastObstacleType === 'fridge' || state.lastObstacleType === 'flyer') && (type === 'fridge' || type === 'flyer')) {
    type = Math.random() < 0.65 ? 'tube' : 'crate';
  }

  const x = CONFIG.width + 24;
  if (type === 'tube') {
    const tall = Math.random() < 0.3;
    const width = tall ? 30 : 26;
    const height = tall ? 54 : 42;
    state.obstacles.push({ type, destructible: true, x, y: CONFIG.groundY - height, width, height, zombie: isNight(), wobble: Math.random() * Math.PI * 2 });
  } else if (type === 'crate') {
    state.obstacles.push({ type, destructible: false, x, y: CONFIG.groundY - 30, width: 44, height: 30 });
  } else if (type === 'fridge') {
    state.obstacles.push({ type, destructible: false, x, y: CONFIG.groundY - 68, width: 42, height: 68 });
  } else {
    const clearance = pick([48, 72, 96]);
    const height = 22;
    state.obstacles.push({ type, destructible: false, x, y: CONFIG.groundY - clearance - height, width: 52, height, bob: Math.random() * Math.PI * 2 });
  }

  state.lastObstacleType = type;
  state.spawnDistance = rand(CONFIG.obstacleMinGap, CONFIG.obstacleMaxGap);
  state.worldDistance = 0;
}

function explode(x, y, color) {
  for (let i = 0; i < 8; i++) {
    state.particles.push({ x, y, vx: rand(-110, 110), vy: rand(-150, 20), life: rand(0.2, 0.45), size: Math.random() < 0.5 ? 4 : 6, color });
  }
}

function spark(x, y) {
  const p = palette();
  for (let i = 0; i < 6; i++) {
    state.particles.push({ x, y, vx: rand(-180, 30), vy: rand(-110, 110), life: rand(0.12, 0.24), size: Math.random() < 0.5 ? 2 : 4, color: i % 2 ? p.warning : p.hot });
  }
}

function bounceBullet(bullet, obstacle) {
  spark(bullet.x + bullet.width, bullet.y + bullet.height / 2);
  bullet.x = obstacle.x - bullet.width - 1;
  bullet.vx = -CONFIG.bulletBounceSpeed;
  bullet.vy = rand(-80, -20);
  bullet.life = Math.min(bullet.life, CONFIG.bulletBounceLife);
}

function gameOver() {
  state.running = false;
  state.best = Math.max(state.best, Math.floor(state.score));
  localStorage.setItem('lab8.best', String(state.best));
  state.flash = 0.25;
}

function update(dt) {
  state.flash = Math.max(0, state.flash - dt);
  guido.shootTimer = Math.max(0, guido.shootTimer - dt);

  state.particles.forEach(p => {
    p.life -= dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vy += 500 * dt;
  });
  state.particles = state.particles.filter(p => p.life > 0);

  if (!state.running) return;

  state.elapsed += dt;
  state.score += CONFIG.scorePerSecond * dt * (0.7 + state.speedIndex * 0.35);
  state.worldDistance += currentSpeed() * dt;
  guido.runFrame += dt * (5 + state.speedIndex * 2);
  guido.vy += CONFIG.gravity * dt;
  guido.y += guido.vy * dt;

  const floor = CONFIG.groundY - guido.height;
  if (guido.y >= floor) {
    guido.y = floor;
    guido.vy = 0;
    guido.grounded = true;
  }

  if (state.worldDistance >= state.spawnDistance) spawnObstacle();

  state.obstacles.forEach(obstacle => {
    obstacle.x -= currentSpeed() * dt;
    if (obstacle.wobble !== undefined) obstacle.wobble += dt * 7;
    if (obstacle.bob !== undefined) obstacle.bob += dt * 4;
  });

  state.bullets.forEach(bullet => {
    bullet.life -= dt;
    bullet.x += bullet.vx * dt;
    bullet.y += bullet.vy * dt;
    bullet.vy += 180 * dt;
  });

  state.obstacles = state.obstacles.filter(obstacle => obstacle.x + obstacle.width > -20);
  state.bullets = state.bullets.filter(bullet => bullet.life > 0 && bullet.x < CONFIG.width + 30 && bullet.x + bullet.width > -30 && bullet.y < CONFIG.height + 20);

  for (let bi = state.bullets.length - 1; bi >= 0; bi--) {
    const bullet = state.bullets[bi];
    if (bullet.vx <= 0) continue;
    for (let oi = state.obstacles.length - 1; oi >= 0; oi--) {
      const obstacle = state.obstacles[oi];
      if (!rectsOverlap(bullet, obstacle, 1)) continue;
      if (obstacle.destructible) {
        explode(obstacle.x + obstacle.width / 2, obstacle.y + obstacle.height / 2, palette().hot);
        state.obstacles.splice(oi, 1);
        state.bullets.splice(bi, 1);
        state.score += CONFIG.tubeScore;
      } else {
        bounceBullet(bullet, obstacle);
      }
      break;
    }
  }

  const hit = { x: guido.x + 5, y: guido.y + 4, width: guido.width - 10, height: guido.height - 5 };
  for (const obstacle of state.obstacles) {
    if (rectsOverlap(hit, obstacle, 2)) {
      gameOver();
      break;
    }
  }
}

function pxRect(x, y, w, h, color) {
  ctx.fillStyle = color;
  ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
}

function drawBackground(p) {
  pxRect(0, 0, CONFIG.width, CONFIG.height, p.sky);
  ctx.fillStyle = p.dark;
  for (let i = 0; i < 16; i++) {
    const x = (i * 83 - (state.elapsed * currentSpeed() * 0.08)) % (CONFIG.width + 40);
    const y = 30 + ((i * 47) % 128);
    ctx.fillRect(Math.round(x), y, 3, 3);
  }
  ctx.fillStyle = p.mid;
  const offset = -(state.elapsed * currentSpeed() * 0.16) % 160;
  for (let x = offset - 160; x < CONFIG.width + 160; x += 160) {
    ctx.fillRect(Math.round(x), 190, 112, 72);
    ctx.fillRect(Math.round(x + 12), 170, 22, 20);
    ctx.fillRect(Math.round(x + 58), 152, 30, 38);
    ctx.fillRect(Math.round(x + 96), 180, 10, 10);
  }
  pxRect(0, CONFIG.groundY, CONFIG.width, 6, p.dark);
  for (let x = -((state.elapsed * currentSpeed()) % 32); x < CONFIG.width; x += 32) pxRect(x, CONFIG.groundY + 12, 18, 4, p.mid);
}

function drawGuido(p) {
  const x = Math.round(guido.x);
  const y = Math.round(guido.y);
  const step = guido.grounded ? Math.floor(guido.runFrame) % 2 : 0;
  pxRect(x + 15, y, 4, 6, p.hot);
  pxRect(x + 18, y - 3, 4, 4, p.hot);
  pxRect(x + 7, y + 6, 21, 16, p.mid);
  pxRect(x + 4, y + 21, 26, 11, p.dark);
  pxRect(x + 10, y + 11, 4, 4, p.sky);
  pxRect(x + 21, y + 11, 4, 4, p.sky);
  pxRect(x + 28, y + 22, 9, 5, p.hot);
  if (step === 0) {
    pxRect(x + 8, y + 32, 6, 6, p.mid);
    pxRect(x + 22, y + 32, 6, 6, p.mid);
  } else {
    pxRect(x + 5, y + 32, 9, 6, p.mid);
    pxRect(x + 22, y + 32, 9, 6, p.mid);
  }
}

function drawTube(tube, p) {
  const x = Math.round(tube.x);
  const y = Math.round(tube.y + Math.sin(tube.wobble) * (tube.zombie ? 1.5 : 0));
  const glass = tube.zombie ? p.hot : p.mid;
  const liquid = tube.zombie ? p.mid : p.hot;
  pxRect(x + 6, y, tube.width - 12, 6, p.dark);
  pxRect(x + 4, y + 6, tube.width - 8, tube.height - 10, glass);
  pxRect(x + 7, y + tube.height - 18, tube.width - 14, 12, liquid);
  pxRect(x + 7, y + tube.height - 6, tube.width - 14, 4, p.dark);
  if (tube.zombie) {
    pxRect(x + 8, y + 15, 5, 4, p.sky);
    pxRect(x + tube.width - 13, y + 15, 5, 4, p.sky);
    pxRect(x + 11, y + 26, tube.width - 22, 4, p.dark);
    pxRect(x + 3, y + 24, 5, 9, p.hot);
    pxRect(x + tube.width - 8, y + 21, 5, 10, p.hot);
  }
}

function drawCrate(crate, p) {
  const x = Math.round(crate.x);
  const y = Math.round(crate.y);
  pxRect(x, y, crate.width, crate.height, p.dark);
  pxRect(x + 4, y + 4, crate.width - 8, crate.height - 8, p.mid);
  pxRect(x + 8, y + 8, crate.width - 16, crate.height - 16, p.dark);
  const cx = x + crate.width / 2;
  const cy = y + crate.height / 2;
  pxRect(cx - 2, cy - 10, 4, 8, p.warning);
  pxRect(cx - 11, cy + 2, 8, 4, p.warning);
  pxRect(cx + 3, cy + 2, 8, 4, p.warning);
  pxRect(cx - 6, cy - 5, 12, 10, p.warning);
  pxRect(cx - 2, cy - 1, 4, 4, p.dark);
}

function drawFridge(fridge, p) {
  const x = Math.round(fridge.x);
  const y = Math.round(fridge.y);
  pxRect(x, y, fridge.width, fridge.height, p.dark);
  pxRect(x + 4, y + 4, fridge.width - 8, fridge.height - 8, p.mid);
  pxRect(x + 7, y + 9, fridge.width - 14, 24, p.sky);
  pxRect(x + 7, y + 38, fridge.width - 14, 22, p.sky);
  pxRect(x + fridge.width - 10, y + 15, 4, 12, p.hot);
  pxRect(x + fridge.width - 10, y + 44, 4, 10, p.hot);
  pxRect(x + 4, y + 34, fridge.width - 8, 4, p.dark);
}

function drawFlyer(flyer, p) {
  const x = Math.round(flyer.x);
  const y = Math.round(flyer.y + Math.sin(flyer.bob) * 3);
  pxRect(x + 7, y, flyer.width - 14, flyer.height, p.dark);
  pxRect(x + 2, y + 5, flyer.width - 4, flyer.height - 10, p.mid);
  pxRect(x, y + 8, 8, 6, p.hot);
  pxRect(x + flyer.width - 8, y + 8, 8, 6, p.hot);
  pxRect(x + 18, y + 6, 16, 10, p.sky);
  pxRect(x + 23, y + flyer.height, 6, 6, p.hot);
}

function drawObstacle(obstacle, p) {
  if (obstacle.type === 'tube') drawTube(obstacle, p);
  else if (obstacle.type === 'crate') drawCrate(obstacle, p);
  else if (obstacle.type === 'fridge') drawFridge(obstacle, p);
  else drawFlyer(obstacle, p);
}

function drawHud(p) {
  ctx.fillStyle = p.dark;
  ctx.font = 'bold 18px monospace';
  ctx.textBaseline = 'top';
  ctx.fillText(`SCORE ${String(Math.floor(state.score)).padStart(6, '0')}`, 20, 16);
  ctx.fillText(`BEST ${String(state.best).padStart(6, '0')}`, 20, 40);
  const names = ['LENTA', 'NORMALE', 'VELOCE'];
  ctx.textAlign = 'right';
  ctx.fillText(`MARCIA ${state.speedIndex + 1}/3 ${names[state.speedIndex]}`, CONFIG.width - 20, 16);
  ctx.fillStyle = isNight() ? p.hot : p.mid;
  ctx.fillText(isNight() ? 'NOTTE // ZOMBIE' : 'GIORNO // LAB', CONFIG.width - 20, 40);
  ctx.textAlign = 'left';
}

function drawOverlay(p) {
  if (state.running) return;
  ctx.fillStyle = `${p.sky}dd`;
  ctx.fillRect(180, 108, 600, 140);
  ctx.strokeStyle = p.dark;
  ctx.lineWidth = 4;
  ctx.strokeRect(180, 108, 600, 140);
  ctx.fillStyle = p.dark;
  ctx.textAlign = 'center';
  ctx.font = 'bold 34px monospace';
  ctx.fillText('CONTAMINAZIONE!', CONFIG.width / 2, 138);
  ctx.font = 'bold 18px monospace';
  ctx.fillText(`PUNTEGGIO ${Math.floor(state.score)}  //  BEST ${state.best}`, CONFIG.width / 2, 185);
  ctx.font = '16px monospace';
  ctx.fillText('R / INVIO / TAP PER RIPARTIRE', CONFIG.width / 2, 218);
  ctx.textAlign = 'left';
}

function render() {
  const p = palette();
  drawBackground(p);
  state.obstacles.forEach(obstacle => drawObstacle(obstacle, p));
  state.bullets.forEach(bullet => {
    pxRect(bullet.x, bullet.y, bullet.width, bullet.height, p.hot);
    const tailX = bullet.vx >= 0 ? bullet.x + bullet.width : bullet.x - 4;
    pxRect(tailX, bullet.y + 1, 4, 2, p.dark);
  });
  state.particles.forEach(particle => pxRect(particle.x, particle.y, particle.size, particle.size, particle.color));
  drawGuido(p);
  drawHud(p);
  drawOverlay(p);
  if (state.flash > 0) {
    ctx.globalAlpha = state.flash * 2.5;
    ctx.fillStyle = p.hot;
    ctx.fillRect(0, 0, CONFIG.width, CONFIG.height);
    ctx.globalAlpha = 1;
  }
}

let lastTime = performance.now();
function loop(now) {
  const dt = Math.min(CONFIG.maxDelta, (now - lastTime) / 1000);
  lastTime = now;
  update(dt);
  render();
  requestAnimationFrame(loop);
}

canvas.focus();
requestAnimationFrame(loop);

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(error => console.warn('LAB-8 service worker non disponibile:', error)));
}
