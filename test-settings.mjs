import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

function harness(initial = {}) {
  const store = new Map(Object.entries(initial));
  const noop = () => {};
  const listeners = new Map();
  const makeButton = (dataset = {}) => ({ dataset, classList:{ toggle:noop }, addEventListener:(n,f)=>listeners.set(`${dataset.startSpeed ?? 'button'}:${n}`,f), textContent:'' });
  const speeds = [0,1,2].map(v => makeButton({ startSpeed:String(v) }));
  const els = {
    '#settingsOverlay': { hidden:true }, '#settingsButton': makeButton(), '#settingsClose': makeButton(), '#settingsSave': makeButton(),
    '#playerName': { value:'', focus:noop, select:noop }, '#settingsPinStatus': { textContent:'' }, '#settingsPinAction': makeButton(),
    '#game': { focus:noop }
  };
  const document = { querySelector:s=>els[s]||null, querySelectorAll:s=>s==='[data-start-speed]'?speeds:[] };
  const localStorage = { getItem:k=>store.get(k)??null, setItem:(k,v)=>store.set(k,String(v)) };
  const sandbox = { console, document, localStorage, Lab8Pin:{ blocksGameplay:()=>false, isPinActive:()=>false, openSettings:noop }, Lab8Game:{ applyInitialSpeed:v=>sandbox.applied=v } };
  sandbox.globalThis=sandbox; sandbox.window=sandbox;
  vm.createContext(sandbox); vm.runInContext(fs.readFileSync('./settings.js','utf8'),sandbox);
  return { sandbox, store, api:sandbox.Lab8Settings, els, listeners };
}

{
  const h=harness();
  assert.equal(h.api.playerName(),'GUIDO');
  assert.equal(h.api.initialSpeedIndex(),1);
  h.api.open();
  h.els['#playerName'].value='  ALESSIO  ';
  h.listeners.get('2:click')();
  assert.equal(h.api._test.selectedSpeed, 2);
  h.api._test.save();
  assert.equal(h.store.get('lab8.playerName'),'ALESSIO');
  assert.equal(h.store.get('lab8.initialSpeedIndex'),'2');
  assert.equal(h.sandbox.applied,2);
  assert.equal(h.api.blocksGameplay(),false);
}

{
  const h=harness({'lab8.playerName':'MARIO','lab8.initialSpeedIndex':'0'});
  assert.equal(h.api.playerName(),'MARIO');
  assert.equal(h.api.initialSpeedIndex(),0);
}
console.log('LAB-8 settings tests: OK');
