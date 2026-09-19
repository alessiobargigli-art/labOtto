(() => {
  const root = document.documentElement;
  const wrap = document.querySelector('.canvas-wrap');
  const canvases = [document.querySelector('#game'), document.querySelector('#pinOverlay')];
  let pending = false;

  function fitCanvas() {
    // Size the canvas element itself: the PIN uses its rect for hit testing.
    const scale = Math.max(0, Math.min(wrap.clientWidth / 960, wrap.clientHeight / 360));
    for (const canvas of canvases) {
      canvas.style.width = `${960 * scale}px`;
      canvas.style.height = `${360 * scale}px`;
    }
  }

  function sync() {
    pending = false;
    const viewport = window.visualViewport;
    root.style.setProperty('--viewport-width', `${viewport?.width || window.innerWidth}px`);
    root.style.setProperty('--viewport-height', `${viewport?.height || window.innerHeight}px`);
    root.style.setProperty('--viewport-top', `${viewport?.offsetTop || 0}px`);
    root.style.setProperty('--viewport-left', `${viewport?.offsetLeft || 0}px`);
    fitCanvas();
  }

  function schedule() {
    if (!pending) { pending = true; requestAnimationFrame(sync); }
  }

  // The first measurement runs before game startup/focus and audio loading.
  sync();
  new ResizeObserver(fitCanvas).observe(wrap);
  for (const event of ['resize', 'orientationchange', 'pageshow']) window.addEventListener(event, schedule);
  for (const event of ['fullscreenchange', 'webkitfullscreenchange']) document.addEventListener(event, schedule);
  window.visualViewport?.addEventListener('resize', schedule);
  window.visualViewport?.addEventListener('scroll', schedule);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) schedule(); });

  // iPad/iPhone Safari can still trigger native zoom/callout gestures even with
  // user-scalable=no. Block them only on the game surface, while leaving form
  // controls and scrollable panels usable.
  const isEditable = (target) => target?.closest?.('input, textarea, select, [contenteditable="true"], .pixel-panel');
  const isGameSurface = (target) => target?.closest?.('.game-frame, .titlebar, .loading-overlay');
  for (const eventName of ['gesturestart', 'gesturechange', 'gestureend']) {
    document.addEventListener(eventName, (event) => {
      if (isGameSurface(event.target) && !isEditable(event.target)) event.preventDefault();
    }, { passive: false });
  }
  document.addEventListener('dblclick', (event) => {
    if (isGameSurface(event.target) && !isEditable(event.target)) event.preventDefault();
  }, { passive: false });
  document.addEventListener('contextmenu', (event) => {
    if (isGameSurface(event.target) && !isEditable(event.target)) event.preventDefault();
  });
})();
