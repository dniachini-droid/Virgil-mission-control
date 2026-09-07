/**
 * Captures screenshots of both spikes at defined steps and camera positions using the
 * pre-installed Chromium. In this container rendering is software (SwiftShader); the
 * captures are evidence of structure and data-contract behaviour, not of final visual quality.
 * Usage: pnpm --filter mission-control build && pnpm --filter mission-control capture
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { chromium } from '@playwright/test';
import { preview } from 'vite';

const outDir = resolve(import.meta.dirname, '../../../docs/art-direction/spikes');
mkdirSync(outDir, { recursive: true });

const shots: Array<{ route: string; step: number; name: string; query?: string }> = [
  { route: '/spike/foundry', step: 0, name: 'foundry-00-overview' },
  { route: '/spike/foundry', step: 1, name: 'foundry-01-file-read' },
  { route: '/spike/foundry', step: 3, name: 'foundry-03-file-edit' },
  { route: '/spike/foundry', step: 5, name: 'foundry-05-staging-cradle' },
  { route: '/spike/foundry', step: 6, name: 'foundry-06-sealed-commit' },
  { route: '/spike/foundry', step: 7, name: 'foundry-07-push-transit' },
  { route: '/spike/foundry', step: 8, name: 'foundry-08-remote-confirmed' },
  { route: '/spike/foundry', step: 9, name: 'foundry-09-handoff' },
  { route: '/spike/foundry', step: 10, name: 'foundry-10-refused' },
  {
    route: '/spike/foundry',
    step: 6,
    name: 'foundry-06-reduced-motion-mobile',
    query: '&reduced=1&tier=mobile',
  },
  { route: '/spike/mind', step: 0, name: 'mind-00-overview' },
  { route: '/spike/mind', step: 1, name: 'mind-01-gateway' },
  { route: '/spike/mind', step: 3, name: 'mind-03-hashed-sealed' },
  { route: '/spike/mind', step: 4, name: 'mind-04-non-destructive-read' },
  { route: '/spike/mind', step: 5, name: 'mind-05-compilation-proposed' },
  { route: '/spike/mind', step: 6, name: 'mind-06-provenance-tether' },
  { route: '/spike/mind', step: 7, name: 'mind-07-contested' },
  { route: '/spike/mind', step: 8, name: 'mind-08-durable-node' },
  { route: '/spike/mind', step: 9, name: 'mind-09-scan-finding' },
];

async function main() {
  const server = await preview({
    root: resolve(import.meta.dirname, '..'),
    preview: { port: 4173, strictPort: true },
  });
  const base = 'http://localhost:4173';
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
  const report: Array<Record<string, unknown>> = [];
  try {
    for (const shot of shots) {
      const mobile = shot.query?.includes('tier=mobile');
      const page = await browser.newPage({
        viewport: mobile ? { width: 430, height: 860 } : { width: 1440, height: 900 },
        deviceScaleFactor: 1,
      });
      const errors: string[] = [];
      page.on('pageerror', (e) => errors.push(String(e)));
      page.on('console', (m) => {
        if (m.type() === 'error' && !/favicon|404/.test(m.text())) errors.push(m.text());
      });
      const url = `${base}${shot.route}?step=${shot.step}${shot.query ?? '&tier=desktop'}`;
      await page.goto(url, { waitUntil: 'networkidle' });
      await page.waitForFunction(
        () => (window as Window & { __spikeReady?: boolean }).__spikeReady === true,
        null,
        { timeout: 60_000 },
      );
      await page.waitForTimeout(shot.step === 0 ? 1500 : 3200);
      const renderer = await page.evaluate(
        () => (window as Window & { __virgilRenderer?: string }).__virgilRenderer ?? '',
      );
      const file = resolve(outDir, `${shot.name}.png`);
      await page.screenshot({ path: file, fullPage: false });
      report.push({
        name: shot.name,
        url,
        renderer,
        errors,
        file: `docs/art-direction/spikes/${shot.name}.png`,
      });
      console.log(
        `${shot.name.padEnd(36)} ${errors.length ? `ERRORS: ${errors.join(' | ').slice(0, 200)}` : 'ok'}`,
      );
      await page.close();
    }
  } finally {
    await browser.close();
    await server.close();
  }
  writeFileSync(resolve(outDir, 'capture-report.json'), `${JSON.stringify(report, null, 2)}\n`);
  const failed = report.filter((r) => (r.errors as string[]).length > 0);
  if (failed.length) {
    console.error(`${failed.length} captures reported page errors`);
    process.exit(1);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
