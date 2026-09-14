import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'lab8-server-'));
const port = 18080 + Math.floor(Math.random() * 1000);
const child = spawn(process.execPath, ['server.mjs'], {
  cwd: process.cwd(),
  env: { ...process.env, PORT: String(port), LAB8_DB: path.join(dir, 'test.sqlite'), NODE_NO_WARNINGS: '1' },
  stdio: ['ignore', 'pipe', 'pipe']
});

try {
  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('server start timeout')), 5000);
    child.stdout.on('data', (data) => { if (String(data).includes('listening')) { clearTimeout(timer); resolve(); } });
    child.once('exit', code => reject(new Error(`server exited ${code}`)));
  });

  const base = `http://127.0.0.1:${port}`;
  const page = await fetch(`${base}/`);
  assert.equal(page.status, 200);
  const html = await page.text();
  assert.match(html, /VERSIONE 2\.0\.0/);
  assert.match(html, /game-v2\.js/);

  const insert = await fetch(`${base}/api/leaderboard`, { method:'POST', headers:{'content-type':'application/json'}, body:JSON.stringify({name:'TESTER',score:777}) });
  assert.equal(insert.status, 201);
  const inserted = await insert.json();
  assert.equal(inserted.qualified, true);
  assert.equal(inserted.rank, 1);

  const get = await fetch(`${base}/api/leaderboard`);
  assert.equal(get.status, 200);
  const data = await get.json();
  assert.equal(data.leaderboard[0].name, 'TESTER');
  assert.equal(data.leaderboard[0].score, 777);
  assert.ok(data.leaderboard[0].occurredAt);

  const hidden = await fetch(`${base}/server.mjs`);
  assert.equal(hidden.status, 404);
  console.log('LAB-8 server integration tests: OK');
} finally {
  child.kill('SIGTERM');
  fs.rmSync(dir, { recursive:true, force:true });
}
