/**
 * Records a video of one route auto-advancing through its steps, using Playwright's context
 * recording on the pre-installed Chromium (software rendering: timing and smoothness are not
 * representative). Usage:
 *   pnpm --filter mission-control exec tsx e2e/record.ts "/spike/foundry" out-dir [stepCount] [msPerStep]
 */
import { mkdirSync, readdirSync, renameSync } from 'node:fs';
import { resolve } from 'node:path';
import { chromium } from '@playwright/test';
import { preview } from 'vite';

async function main() {
  const [route = '/spike/foundry', outDir = 'video', stepsArg = '26', msArg = '2600'] =
    process.argv.slice(2);
  const steps = Number(stepsArg);
  const msPerStep = Number(msArg);
  mkdirSync(resolve(outDir), { recursive: true });
  const server = await preview({
    root: resolve(import.meta.dirname, '..'),
    preview: { port: 4175, strictPort: true },
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
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    deviceScaleFactor: 1,
    recordVideo: { dir: resolve(outDir), size: { width: 1280, height: 800 } },
  });
  try {
    const page = await context.newPage();
    const sep = route.includes('?') ? '&' : '?';
    await page.goto(`http://localhost:4175${route}${sep}tier=laptop&step=0`, {
      waitUntil: 'networkidle',
    });
    await page.waitForFunction(
      () => (window as Window & { __spikeReady?: boolean }).__spikeReady === true,
      null,
      { timeout: 90_000 },
    );
    await page.waitForTimeout(msPerStep);
    for (let i = 1; i < steps; i++) {
      await page.keyboard.press('ArrowRight');
      await page.waitForTimeout(msPerStep);
    }
    await page.close();
  } finally {
    await context.close();
    await browser.close();
    await server.close();
  }
  const files = readdirSync(resolve(outDir)).filter((f) => f.endsWith('.webm'));
  const latest = files.sort().at(-1);
  if (latest) {
    const name = `${route.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '')}.webm`;
    renameSync(resolve(outDir, latest), resolve(outDir, name));
    console.log(`recorded ${resolve(outDir, name)}`);
  }
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
