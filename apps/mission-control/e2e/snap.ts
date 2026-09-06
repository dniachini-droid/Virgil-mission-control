/**
 * Quick screenshot of one route for iteration: builds nothing, expects `vite build` output.
 * Usage: pnpm --filter mission-control exec tsx e2e/snap.ts "/spike/characters?mode=work" out.png [width height] [waitMs]
 */
import { resolve } from 'node:path';
import { chromium } from '@playwright/test';
import { preview } from 'vite';

async function main() {
  const [route = '/spike/foundry', out = 'snap.png', w = '1440', h = '900', wait = '2500'] =
    process.argv.slice(2);
  const server = await preview({
    root: resolve(import.meta.dirname, '..'),
    preview: { port: 4174, strictPort: true },
  });
  const browser = await chromium.launch({
    executablePath:
      process.env.CHROMIUM_PATH ?? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
    args: [
      '--use-gl=angle',
      '--use-angle=swiftshader',
      '--enable-unsafe-swiftshader',
      '--no-sandbox',
      '--disable-gpu-sandbox',
    ],
  });
  try {
    const page = await browser.newPage({
      viewport: { width: Number(w), height: Number(h) },
      deviceScaleFactor: 1,
    });
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(String(e)));
    page.on('console', (m) => {
      if (m.type() === 'error' && !/favicon|404/.test(m.text())) errors.push(m.text());
    });
    const sep = route.includes('?') ? '&' : '?';
    await page.goto(`http://localhost:4174${route}${sep}tier=desktop`, {
      waitUntil: 'networkidle',
    });
    await page.waitForFunction(
      () => (window as Window & { __spikeReady?: boolean }).__spikeReady === true,
      null,
      { timeout: 90_000 },
    );
    await page.waitForTimeout(Number(wait));
    await page.screenshot({ path: resolve(out), fullPage: false });
    console.log(`${out} ${errors.length ? `ERRORS: ${errors.join(' | ').slice(0, 400)}` : 'ok'}`);
  } finally {
    await browser.close();
    await server.close();
  }
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
