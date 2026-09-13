(() => {
  const AUDIO = { context: null, master: null };

  function ensureAudio() {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return null;
    if (!AUDIO.context) {
      AUDIO.context = new AudioContextClass();
      AUDIO.master = AUDIO.context.createGain();
      AUDIO.master.gain.value = 0.12;
      AUDIO.master.connect(AUDIO.context.destination);
    }
    if (AUDIO.context.state === 'suspended') AUDIO.context.resume().catch(() => {});
    return AUDIO.context;
  }

  function tone(frequency, duration = 0.08, options = {}) {
    const audio = ensureAudio();
    if (!audio || !AUDIO.master) return;
    const { type = 'square', volume = 0.7, slide = 0, delay = 0 } = options;
    const start = audio.currentTime + delay;
    const osc = audio.createOscillator();
    const gain = audio.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(Math.max(30, frequency), start);
    if (slide) osc.frequency.exponentialRampToValueAtTime(Math.max(30, frequency + slide), start + duration);
    gain.gain.setValueAtTime(Math.max(0.0001, volume), start);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    osc.connect(gain);
    gain.connect(AUDIO.master);
    osc.start(start);
    osc.stop(start + duration + 0.02);
  }

  function play(name) {
    switch (name) {
      case 'jump':
        tone(320, 0.09, { slide: 210, volume: 0.55 });
        break;
      case 'shoot':
        tone(720, 0.055, { slide: -390, volume: 0.5 });
        tone(220, 0.04, { delay: 0.025, volume: 0.25 });
        break;
      case 'gear-up':
        tone(360, 0.055, { volume: 0.4 });
        tone(520, 0.07, { delay: 0.055, volume: 0.45 });
        break;
      case 'gear-down':
        tone(520, 0.055, { volume: 0.4 });
        tone(300, 0.07, { delay: 0.055, volume: 0.45 });
        break;
      case 'destroy':
        tone(260, 0.08, { type: 'sawtooth', slide: -140, volume: 0.5 });
        tone(120, 0.11, { delay: 0.035, volume: 0.35 });
        break;
      case 'ricochet':
        tone(980, 0.045, { slide: -180, volume: 0.38 });
        break;
      case 'boss-enter':
        tone(110, 0.18, { type: 'sawtooth', slide: 70, volume: 0.55 });
        tone(165, 0.18, { delay: 0.16, type: 'sawtooth', slide: 90, volume: 0.5 });
        tone(220, 0.22, { delay: 0.32, volume: 0.5 });
        break;
      case 'boss-attack':
        tone(145, 0.1, { type: 'sawtooth', slide: -45, volume: 0.38 });
        break;
      case 'weak-hit':
        tone(780, 0.08, { volume: 0.5 });
        tone(1040, 0.1, { delay: 0.06, volume: 0.45 });
        break;
      case 'victory':
        [392, 523, 659, 784].forEach((frequency, index) => tone(frequency, 0.12, { delay: index * 0.1, volume: 0.42 }));
        break;
      case 'game-over':
        tone(300, 0.12, { slide: -90, volume: 0.48 });
        tone(190, 0.16, { delay: 0.1, slide: -80, volume: 0.48 });
        tone(95, 0.24, { delay: 0.23, volume: 0.45 });
        break;
      case 'restart':
        tone(330, 0.06, { volume: 0.35 });
        tone(495, 0.08, { delay: 0.06, volume: 0.4 });
        break;
      case 'refresh':
        tone(440, 0.05, { volume: 0.35 });
        tone(660, 0.06, { delay: 0.05, volume: 0.4 });
        tone(880, 0.08, { delay: 0.11, volume: 0.42 });
        break;
    }
  }

  function wrap(name, sound) {
    const original = window[name];
    if (typeof original !== 'function') return;
    window[name] = function (...args) {
      play(typeof sound === 'function' ? sound(...args) : sound);
      return original.apply(this, args);
    };
  }

  wrap('jump', 'jump');
  wrap('shoot', 'shoot');
  wrap('changeSpeed', (direction) => direction > 0 ? 'gear-up' : 'gear-down');
  wrap('resetGame', 'restart');
  wrap('gameOver', 'game-over');
  wrap('enterBossStage', 'boss-enter');
  wrap('spawnBossAttack', 'boss-attack');
  wrap('returnToRunner', 'victory');
  wrap('explode', 'destroy');
  wrap('spark', 'ricochet');

  document.querySelector('#forceRefresh')?.addEventListener('click', () => play('refresh'), { capture: true });

  window.Lab8Audio = { play };
})();
