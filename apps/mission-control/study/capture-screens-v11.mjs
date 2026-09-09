/**
 * Builds the study page, serves it, and screenshots every state of every
 * display into `scratchpad/study-v11-screens/`. Synchronous from end to
 * end: the server is started and stopped inside this one process, so
 * nothing survives the run.
 *
 * Usage: node study/capture-screens-v11.mjs [tier] [outDir]
 */
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, resolve } from 'node:path';
import { chromium } from '@playwright/test';

const appRoot = resolve(import.meta.dirname, '..');
const repoRoot = resolve(appRoot, '../..');
const tier = process.argv[2] ?? 'mobile';
const outDir = resolve(repoRoot, process.argv[3] ?? 'scratchpad/study-v11-screens');
const dist = join(appRoot, 'dist/study-v11');

console.log('study: building');
execFileSync('npx', ['vite', 'build', '--config', 'study/vite.study.config.ts'], {
  cwd: appRoot,
  stdio: 'inherit',
});

const TYPES = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
};

const server = createServer((request, response) => {
  const path = (request.url ?? '/').split('?')[0];
  const file = join(dist, path === '/' ? 'study/screens-v11.html' : path);
  if (!existsSync(file)) {
    response.writeHead(404);
    response.end('not found');
    return;
  }
  response.writeHead(200, { 'content-type': TYPES[extname(file)] ?? 'application/octet-stream' });
  response.end(readFileSync(file));
});

await new Promise((done) => server.listen(0, '127.0.0.1', done));
const port = server.address().port;
mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch({
  executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  args: ['--enable-unsafe-swiftshader'],
});
const page = await browser.newPage({
  viewport: { width: 1500, height: 1200 },
  deviceScaleFactor: 1,
});
page.on('console', (message) => {
  if (message.type() === 'error') console.error('study console:', message.text());
});
page.on('pageerror', (error) => console.error('study pageerror:', error.message));

const MOMENTS = [
  'working',
  'receiving',
  'passed',
  'blocked',
  'insufficient',
  'standby',
  'owner-gate',
];
for (const moment of MOMENTS) {
  await page.goto(`http://127.0.0.1:${port}/?tier=${tier}&only=${moment}`, { waitUntil: 'load' });
  await page.waitForFunction('window.__studyReady === true', undefined, { timeout: 60000 });
  const section = page.locator('section').first();
  const file = join(outDir, `${tier}-${moment}.png`);
  await section.screenshot({ path: file });
  console.log('study:', file);
}
await browser.close();
server.close();
console.log('study: done');
