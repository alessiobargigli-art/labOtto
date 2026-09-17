(() => {
  const game = globalThis.Lab8Game;
  const state = game?._test?.state;
  const canvasWrap = document.querySelector('.canvas-wrap');
  if (!state || !canvasWrap) return;

  let paused = false;
  const button = document.createElement('button');
  button.id = 'pauseButton';
  button.className = 'pause-button';
  button.type = 'button';
  button.setAttribute('aria-label', 'Metti in pausa');
  button.textContent = 'Ⅱ PAUSA';

  const overlay = document.createElement('div');
  overlay.id = 'pauseOverlay';
  overlay.className = 'pause-overlay';
  overlay.hidden = true;
  overlay.innerHTML = '<div class="pause-card"><strong>PAUSA</strong><span>TAP PER CONTINUARE</span></div>';
  canvasWrap.append(button, overlay);

  function canPause(){
    return state.mode === 'RUNNER' || state.mode === 'BOSS';
  }

  function setPaused(value){
    if (value && !canPause()) return;
    paused = Boolean(value);
    state.running = !paused;
    overlay.hidden = !paused;
    button.textContent = paused ? '▶ RIPRENDI' : 'Ⅱ PAUSA';
    button.setAttribute('aria-label', paused ? 'Riprendi il gioco' : 'Metti in pausa');
    if (paused) globalThis.Lab8Audio?.pauseMusic?.();
    else globalThis.Lab8Audio?.resumeMusic?.();
  }

  function toggle(e){
    e?.preventDefault();
    e?.stopPropagation();
    setPaused(!paused);
  }

  button.addEventListener('pointerdown', toggle);
  overlay.addEventListener('pointerdown', toggle);
  window.addEventListener('keydown', (e) => {
    if (e.key.toLowerCase() === 'p' || e.key === 'Escape') toggle(e);
  });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && canPause() && state.running) setPaused(true);
  });

  globalThis.Lab8Pause = { toggle, pause:()=>setPaused(true), resume:()=>setPaused(false), isPaused:()=>paused };
})();