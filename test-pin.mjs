import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

function createHarness(initialStorage = {}) {
  const store = new Map(Object.entries(initialStorage));
  const noop = () => {};
  const ctx = new Proxy({}, { get: (t, p) => t[p] ?? noop, set: (t, p, v) => (t[p] = v, true) });
  const listeners = {};
  const overlay = {
    width: 960, height: 360, hidden: true,
    getContext: () => ctx,
    setAttribute: noop,
    addEventListener: (name, fn) => { listeners[`overlay:${name}`] = fn; },
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 960, height: 360 }),
  };
  const game = { focus: noop };
  const settings = { setAttribute: noop, addEventListener: (name, fn) => { listeners[`settings:${name}`] = fn; } };
  const document = { querySelector: (s) => s === '#pinOverlay' ? overlay : s === '#game' ? game : s === '#pinSettings' ? settings : null };
  const localStorage = {
    getItem: (k) => store.has(k) ? store.get(k) : null,
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: (k) => store.delete(k),
  };
  const sandbox = { console, document, localStorage };
  sandbox.window = sandbox;
  sandbox.globalThis = sandbox;
  sandbox.addEventListener = (name, fn) => { listeners[`window:${name}`] = fn; };
  vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync(new URL('./pin.js', import.meta.url), 'utf8'), sandbox);
  return { sandbox, store, api: sandbox.Lab8Pin, listeners };
}

{
  const h = createHarness();
  assert.equal(h.api.blocksGameplay(), true);
  assert.equal(h.api._test.access.mode, 'setup-enter');
  for (const d of '1234') h.api._test.activateKey(d);
  h.api._test.activateKey('OK');
  assert.equal(h.api._test.access.mode, 'setup-confirm');
  for (const d of '1234') h.api._test.activateKey(d);
  h.api._test.activateKey('OK');
  assert.equal(h.store.get('lab8.pin'), '1234');
  assert.equal(h.store.get('lab8.pinSetupDone'), '1');
  assert.equal(h.api.blocksGameplay(), false);
}

{
  const h = createHarness();
  const pointer = h.listeners['overlay:pointerdown'];
  let prevented = false;
  let stopped = false;
  pointer({ clientX: 360, clientY: 150, preventDefault: () => { prevented = true; }, stopPropagation: () => { stopped = true; } });
  assert.equal(h.api._test.access.input, '1');
  assert.equal(prevented, true);
  assert.equal(stopped, true);
}

{
  const h = createHarness();
  for (const d of '1234') h.api._test.activateKey(d);
  h.api._test.activateKey('OK');
  for (const d of '9999') h.api._test.activateKey(d);
  h.api._test.activateKey('OK');
  assert.equal(h.api._test.access.mode, 'setup-enter');
  assert.equal(h.store.has('lab8.pin'), false);
}

{
  const h = createHarness();
  h.api._test.activateKey('SKIP');
  assert.equal(h.api.blocksGameplay(), false);
  assert.equal(h.store.get('lab8.pinSetupDone'), '1');
  const next = createHarness(Object.fromEntries(h.store));
  assert.equal(next.api.blocksGameplay(), false);
  assert.equal(next.api.isPinActive(), false);
}

{
  const h = createHarness({ 'lab8.pin': '654321', 'lab8.pinSetupDone': '1' });
  assert.equal(h.api._test.access.mode, 'unlock');
  for (const d of '111111') h.api._test.activateKey(d);
  h.api._test.activateKey('OK');
  assert.equal(h.api.blocksGameplay(), true);
  assert.equal(h.api._test.access.mode, 'unlock');
  for (const d of '654321') h.api._test.activateKey(d);
  h.api._test.activateKey('OK');
  assert.equal(h.api.blocksGameplay(), false);
}

{
  const h = createHarness({ 'lab8.pin': '2468', 'lab8.pinSetupDone': '1' });
  for (const d of '2468') h.api._test.activateKey(d);
  h.api._test.activateKey('OK');
  h.api.openSettings();
  assert.equal(h.api._test.access.mode, 'settings');
  h.api._test.settingsPrimaryAction();
  assert.equal(h.api._test.access.mode, 'disable-confirm');
  for (const d of '0000') h.api._test.activateKey(d);
  h.api._test.activateKey('OK');
  assert.equal(h.store.get('lab8.pin'), '2468');
  for (const d of '2468') h.api._test.activateKey(d);
  h.api._test.activateKey('OK');
  assert.equal(h.store.has('lab8.pin'), false);
  assert.equal(h.api._test.access.mode, 'settings');
}

{
  const h = createHarness({ 'lab8.pinSetupDone': '1' });
  h.api.openSettings();
  h.api._test.settingsPrimaryAction();
  assert.equal(h.api._test.access.mode, 'enable-enter');
  for (const d of '13579') h.api._test.activateKey(d);
  h.api._test.activateKey('OK');
  for (const d of '13579') h.api._test.activateKey(d);
  h.api._test.activateKey('OK');
  assert.equal(h.store.get('lab8.pin'), '13579');
  assert.equal(h.api.blocksGameplay(), false);
}

console.log('LAB-8 PIN tests: OK');
