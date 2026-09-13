import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const noop=()=>{};
function makeNode(){ return { hidden:true,textContent:'',innerHTML:'',className:'',children:[],addEventListener:noop,appendChild(n){this.children.push(n)},querySelector(sel){ if(sel==='strong') return this.strong??=(makeNode()); if(sel==='time') return this.time??=(makeNode()); return null; } }; }
const nodes={ '#leaderboardOverlay':makeNode(),'#leaderboardList':makeNode(),'#leaderboardStatus':makeNode(),'#leaderboardButton':makeNode(),'#leaderboardClose':makeNode(),'#leaderboardToast':makeNode(),'#game':{focus:noop} };
const document={querySelector:s=>nodes[s]||null,createElement:()=>makeNode()};
let posted=null;
const fetch=async (url,opts={})=>{
  if(opts.method==='POST'){ posted=JSON.parse(opts.body); return {ok:true,json:async()=>({qualified:true,rank:3,leaderboard:[]})}; }
  return {ok:true,json:async()=>({leaderboard:[{name:'AAA',score:99,occurredAt:'2026-09-13T10:00:00Z'}]})};
};
const sandbox={console,document,fetch,setTimeout:()=>1,clearTimeout:noop,Lab8Settings:{playerName:()=> 'PLAYER'}}; sandbox.globalThis=sandbox; sandbox.window=sandbox;
vm.createContext(sandbox);vm.runInContext(fs.readFileSync('./leaderboard.js','utf8'),sandbox);
await sandbox.Lab8Leaderboard.recordScore(123.9,'g1');
assert.deepEqual(posted,{name:'PLAYER',score:123});
await sandbox.Lab8Leaderboard.recordScore(999,'g1');
assert.deepEqual(posted,{name:'PLAYER',score:123});
await sandbox.Lab8Leaderboard.load();
assert.equal(nodes['#leaderboardList'].children.length,1);
console.log('LAB-8 leaderboard UI tests: OK');
