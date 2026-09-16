import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const source = fs.readFileSync(new URL('./sw.js', import.meta.url), 'utf8');
const html = fs.readFileSync(new URL('./index.html', import.meta.url), 'utf8');
const audio = fs.readFileSync(new URL('./audio.js', import.meta.url), 'utf8');
const version = /const VERSION = '([^']+)'/.exec(source)[1];
assert.ok(html.includes(`VERSIONE ${version}`));
const assets = [...html.matchAll(/(?:src|href)="([^"]+\.(?:js|css|mp3)(?:\?[^"]*)?)"/g)].map((match) => match[1]);
assert.ok(assets.length > 10);
for (const asset of assets) assert.equal(new URL(asset, 'https://test/').searchParams.get('v'), version, asset);
assert.ok(audio.includes(`MUSIC_URL='audio/alien-battle-loop.mp3?v=${version}'`));

// Execute the actual worker with an in-memory CacheStorage and network.
const scope = 'https://example.test/labOtto/';
const prefix = `lab8:${scope}:`;
const name = `${prefix}${version}`;
const records = new Map();
const events = {};
const network = [];
const key = (request) => typeof request === 'string' ? request : request.url;
let offline = false, claimed = false, skipped = false;
const caches = {
  async open(name) {
    if (!records.has(name)) records.set(name, new Map());
    const entries = records.get(name);
    return {
      async match(request) { return entries.get(key(request))?.clone(); },
      async put(request, response) { entries.set(key(request), response); },
      async addAll(requests) {
        for (const request of requests) {
          assert.equal(request.cache, 'reload');
          entries.set(request.url, new Response(`CURRENT ${request.url}`));
        }
      },
    };
  },
  async keys() { return [...records.keys()]; },
  async delete(name) { return records.delete(name); },
};
records.set('lab8-v2.0.10', new Map([[`${scope}audio.js`, new Response('STALE')]]));
records.set(`${prefix}older`, new Map());
records.set('another-app', new Map());
records.set('lab8:https://example.test/other/:1', new Map());
const context = vm.createContext({
  URL, Request, Response, caches,
  fetch: async (request) => {
    network.push(key(request));
    if (offline) throw new Error('offline');
    return new Response(`NETWORK ${key(request)} VERSIONE ${version}`);
  },
  self: {
    registration: { scope },
    addEventListener: (type, listener) => { events[type] = listener; },
    skipWaiting: async () => { skipped = true; },
    clients: { claim: async () => { claimed = true; } },
  },
});
vm.runInContext(source, context);
async function lifecycle(type) {
  let pending;
  events[type]({ waitUntil: (promise) => { pending = promise; } });
  await pending;
}
async function request(path, navigate = false) {
  const req = new Request(new URL(path, scope));
  if (navigate) Object.defineProperty(req, 'mode', { value: 'navigate' });
  let pending;
  const background = [];
  events.fetch({ request: req, respondWith: (promise) => { pending = promise; }, waitUntil: (promise) => background.push(promise) });
  const response = await pending;
  await Promise.all(background);
  return response;
}

// Even before installation, legacy cached audio must not win.
assert.match(await (await request('audio.js')).text(), /^NETWORK /);
await lifecycle('install');
assert.equal(skipped, true);
for (const asset of assets) assert.ok(records.get(name).has(new URL(asset, scope).href), `Missing offline asset: ${asset}`);
await lifecycle('activate');
assert.equal(claimed, true);
assert.equal(records.has(`${prefix}older`), false);
assert.equal(records.has('another-app'), true);
assert.equal(records.has('lab8:https://example.test/other/:1'), true);
assert.match(await (await request(`audio.js?v=${version}`)).text(), /^CURRENT /);
assert.match(await (await request('audio.js?v=future')).text(), /^NETWORK /);
assert.match(await (await request('./', true)).text(), /^NETWORK /);
offline = true;
assert.match(await (await request('./?refresh=123', true)).text(), /^NETWORK /);
assert.match(await (await request(`styles.css?v=${version}`)).text(), /^CURRENT /);
assert.equal(await request('/other/file.js'), undefined);
assert.equal(await request('api/leaderboard'), undefined);

// AGGIORNA deletes this cache: refill the shell for the next offline visit.
offline = false;
await caches.delete(name);
await request('./?refresh=456', true);
for (const asset of assets) await request(asset);
offline = true;
assert.match(await (await request('./', true)).text(), /^NETWORK /);
assert.match(await (await request(`audio.js?v=${version}`)).text(), /^NETWORK /);

// Registration runs before the game, and bypasses cached worker scripts.
const inline = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((match) => match[1]);
let registration, updated = false;
vm.runInNewContext(inline[0], { navigator: { serviceWorker: {
  register: async (...args) => { registration = args; return { update: async () => { updated = true; } }; },
} } });
await new Promise(setImmediate);
assert.equal(registration[0], './sw.js');
assert.equal(registration[1].updateViaCache, 'none');
assert.equal(updated, true);
assert.ok(html.indexOf(inline[0]) < html.indexOf('<script src='));
console.log('LAB-8 cache migration, release URLs, isolation and offline: OK');
