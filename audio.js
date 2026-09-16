(() => {
  const MUSIC_URL='audio/alien-battle-loop.mp3';
  const AUDIO={context:null,master:null,music:null,musicStarted:false,musicReady:false};
  const music=new Audio(MUSIC_URL);
  music.loop=true; music.preload='auto'; music.volume=.045; AUDIO.music=music;
  const splash=document.getElementById('loadingOverlay');
  const text=document.getElementById('loadingText');
  const bar=document.getElementById('loadingBar');
  let done=false;
  function paint(p,label){const n=Math.max(0,Math.min(100,Math.round(p)));if(bar)bar.style.width=n+'%';if(text)text.textContent=label||`CARICAMENTO ${n}%`;}
  function finish(){if(done)return;done=true;AUDIO.musicReady=true;paint(100,'PRONTO');setTimeout(()=>{if(splash){splash.classList.add('is-ready');setTimeout(()=>splash.hidden=true,260)}},180);}
  function progress(){if(!music.buffered.length||!Number.isFinite(music.duration)||music.duration<=0)return;paint(Math.min(96,(music.buffered.end(music.buffered.length-1)/music.duration)*100));}
  music.addEventListener('progress',progress);
  music.addEventListener('loadedmetadata',()=>paint(20));
  music.addEventListener('canplay',()=>{paint(85);setTimeout(finish,120)},{once:true});
  music.addEventListener('canplaythrough',finish,{once:true});
  music.addEventListener('error',()=>{paint(100,'AUDIO NON DISPONIBILE');setTimeout(finish,450)},{once:true});
  paint(5); music.load();
  setTimeout(()=>{if(!done){paint(95,'AVVIO...');finish()}},5000);
  function ensureAudio(){const C=window.AudioContext||window.webkitAudioContext;if(!C)return null;if(!AUDIO.context){AUDIO.context=new C();AUDIO.master=AUDIO.context.createGain();AUDIO.master.gain.value=.12;AUDIO.master.connect(AUDIO.context.destination)}if(AUDIO.context.state==='suspended')AUDIO.context.resume().catch(()=>{});return AUDIO.context}
  function startMusic(){if(AUDIO.musicStarted)return;AUDIO.musicStarted=true;music.play().catch(()=>{AUDIO.musicStarted=false})}
  function unlock(){ensureAudio();startMusic()}
  ['pointerdown','keydown','touchstart'].forEach(type=>window.addEventListener(type,unlock,{once:true,passive:true}));
  function tone(f,d=.08,o={}){const a=ensureAudio();if(!a||!AUDIO.master)return;const{type='square',volume=.7,slide=0,delay=0}=o,s=a.currentTime+delay,osc=a.createOscillator(),g=a.createGain();osc.type=type;osc.frequency.setValueAtTime(Math.max(30,f),s);if(slide)osc.frequency.exponentialRampToValueAtTime(Math.max(30,f+slide),s+d);g.gain.setValueAtTime(Math.max(.0001,volume),s);g.gain.exponentialRampToValueAtTime(.0001,s+d);osc.connect(g);g.connect(AUDIO.master);osc.start(s);osc.stop(s+d+.02)}
  function play(n){switch(n){case'jump':tone(320,.09,{slide:210,volume:.55});break;case'shoot':tone(720,.055,{slide:-390,volume:.5});break;case'gear-up':tone(360,.055,{volume:.4});tone(520,.07,{delay:.055,volume:.45});break;case'gear-down':tone(520,.055,{volume:.4});tone(300,.07,{delay:.055,volume:.45});break;case'destroy':tone(260,.08,{type:'sawtooth',slide:-140,volume:.5});break;case'ricochet':tone(980,.045,{slide:-180,volume:.38});break;case'boss-enter':tone(110,.18,{type:'sawtooth',slide:70,volume:.55});break;case'boss-attack':tone(145,.1,{type:'sawtooth',slide:-45,volume:.38});break;case'weak-hit':tone(780,.08,{volume:.5});break;case'victory':[392,523,659,784].forEach((f,i)=>tone(f,.12,{delay:i*.1,volume:.42}));break;case'game-over':tone(190,.16,{slide:-80,volume:.48});break;case'restart':tone(495,.08,{volume:.4});break;case'refresh':tone(660,.06,{volume:.4});break}}
  function wrap(name,sound){const original=window[name];if(typeof original!=='function')return;window[name]=function(...args){play(typeof sound==='function'?sound(...args):sound);return original.apply(this,args)}}
  wrap('jump','jump');wrap('shoot','shoot');wrap('changeSpeed',d=>d>0?'gear-up':'gear-down');wrap('resetGame','restart');wrap('gameOver','game-over');wrap('enterBossStage','boss-enter');wrap('spawnBossAttack','boss-attack');wrap('returnToRunner','victory');wrap('explode','destroy');wrap('spark','ricochet');
  window.Lab8Audio={play,startMusic};
})();