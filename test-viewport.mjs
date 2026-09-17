import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');

const server = createServer(async (req, res) => {
  try {
    const path = new URL(req.url, 'http://localhost').pathname;
    const body = await readFile(new URL(`.${path === '/' ? '/index.html' : path}`, import.meta.url));
    const ext = path.split('.').pop();
    res.setHeader('Content-Type', ({ js:'text/javascript', css:'text/css', mp3:'audio/mpeg' })[ext] || 'text/html');
    res.end(body);
  } catch { res.writeHead(404).end(); }
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const browser = await chromium.launch({ args:['--no-sandbox'] });
const url = `http://127.0.0.1:${server.address().port}/`;

async function verify(page, label) {
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  const result = await page.evaluate(() => {
    const rect = target => {
      const r = (typeof target === 'string' ? document.querySelector(target) : target).getBoundingClientRect();
      return { left:r.left, top:r.top, right:r.right, bottom:r.bottom, width:r.width, height:r.height };
    };
    return { width:visualViewport.width, height:visualViewport.height, scrollY,
      elements:[...document.querySelectorAll('.shell,.game-frame,.canvas-wrap,#game,.touch-controls,[data-action]')].map(rect),
      canvas:rect('#game'), frame:rect('.canvas-wrap') };
  });
  for (const r of result.elements) {
    assert.ok(r.left >= -1 && r.top >= -1 && r.right <= result.width+1 && r.bottom <= result.height+1, `${label}: clipped ${JSON.stringify(r)}`);
  }
  assert.ok(result.canvas.width > 0 && result.canvas.height > 0, `${label}: canvas visible`);
  assert.ok(Math.abs(result.canvas.width/result.canvas.height-8/3)<0.01, `${label}: distorted canvas`);
  assert.ok(result.canvas.bottom <= result.frame.bottom+1, `${label}: canvas exceeds frame`);
  assert.equal(result.scrollY, 0, `${label}: startup focus scrolled page`);
}

try {
  for (const [width,height] of [[844,390],[932,430],[667,375],[568,320],[390,844],[320,568],[1024,768]]) {
    const context = await browser.newContext({ viewport:{width,height}, isMobile:true, hasTouch:true, serviceWorkers:'block' });
    const page = await context.newPage();
    const errors=[]; page.on('pageerror', error => errors.push(error.message));
    await page.goto(url, {waitUntil:'domcontentloaded'});
    await verify(page, `cold ${width}x${height}`);
    await page.reload({waitUntil:'domcontentloaded'});
    await verify(page, 'reload');
    await page.setViewportSize({width:height,height:width});
    await verify(page, 'rotation');
    await page.setViewportSize({width,height:height-70});
    await verify(page, 'browser toolbar shown');
    await page.setViewportSize({width,height});
    await page.evaluate(() => document.dispatchEvent(new Event('fullscreenchange')));
    await verify(page, 'viewport restored');
    // Simulate device safe areas using the same CSS custom properties as env().
    await page.addStyleTag({content:':root{--safe-top:12px;--safe-right:44px;--safe-bottom:21px;--safe-left:44px}'});
    await verify(page, 'safe areas');
    assert.deepEqual(errors, [], 'browser runtime errors');
    await context.close();
  }
  console.log('LAB-8 mobile viewport: cold load, reload, rotation, toolbar, aspect ratio and safe areas OK');
} finally {
  await browser.close();
  server.close();
}
