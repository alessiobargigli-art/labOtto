import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { LeaderboardStore } from './leaderboard-store.mjs';

const root = path.dirname(fileURLToPath(import.meta.url));
const port = Number(process.env.PORT || 8080);
const dbPath = process.env.LAB8_DB || path.join(root, 'data', 'lab8.sqlite');
fs.mkdirSync(path.dirname(dbPath), { recursive: true });
const store = new LeaderboardStore(dbPath);

const MIME = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8', '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.png': 'image/png', '.ico': 'image/x-icon'
};

function sendJson(res, status, body) {
  const payload = JSON.stringify(body);
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' });
  res.end(payload);
}

async function readJson(req) {
  let data = '';
  for await (const chunk of req) {
    data += chunk;
    if (data.length > 16_384) throw new Error('payload too large');
  }
  return data ? JSON.parse(data) : {};
}

function serveStatic(req, res) {
  const url = new URL(req.url, 'http://localhost');
  const requested = decodeURIComponent(url.pathname === '/' ? '/index.html' : url.pathname);
  const absolute = path.resolve(root, `.${requested}`);
  const ext = path.extname(absolute);
  const relative = path.relative(root, absolute);
  const publicExt = new Set(['.html', '.css', '.js', '.webmanifest', '.png']);
  if (relative.startsWith('..') || path.isAbsolute(relative) || !publicExt.has(ext) || relative.startsWith(`.git${path.sep}`) || relative.startsWith(`data${path.sep}`)) {
    res.writeHead(404); res.end('Not found'); return;
  }
  fs.readFile(absolute, (error, data) => {
    if (error) { res.writeHead(404); res.end('Not found'); return; }
    res.writeHead(200, { 'content-type': MIME[path.extname(absolute)] || 'application/octet-stream' });
    res.end(data);
  });
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://localhost');
    if (url.pathname === '/api/leaderboard' && req.method === 'GET') {
      sendJson(res, 200, { leaderboard: store.top(15) });
      return;
    }
    if (url.pathname === '/api/leaderboard' && req.method === 'POST') {
      const body = await readJson(req);
      const result = store.add({ name: body.name, score: body.score });
      sendJson(res, 201, result);
      return;
    }
    if (url.pathname.startsWith('/api/')) {
      sendJson(res, 404, { error: 'not found' });
      return;
    }
    serveStatic(req, res);
  } catch (error) {
    sendJson(res, 400, { error: error.message });
  }
});

server.listen(port, () => console.log(`LAB-8 1.0 listening on http://localhost:${port}`));
process.on('SIGTERM', () => { store.close(); server.close(); });
