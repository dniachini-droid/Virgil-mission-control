/**
 * Captures the Phase 0.5 prototype (character line-up, Foundry bay success and failed runs,
 * Mind cluster) at defined steps using the pre-installed Chromium. In this container rendering
 * is software (SwiftShader); the captures are evidence of structure and data-contract
 * behaviour, not of final visual quality. The Phase 0 captures stay in docs/art-direction/spikes.
 * Usage: pnpm --filter mission-control build && pnpm --filter mission-control capture
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { chromium } from '@playwright/test';
import { preview } from 'vite';

const outDir = resolve(import.meta.dirname, '../../../docs/art-direction/phase-0-5');
mkdirSync(outDir, { recursive: true });

const shots: Array<{ route: string; step: number; name: string; query?: string; wait?: number }> = [
  { route: '/spike/characters', step: 0, name: 'characters-00-lineup-idle', query: '&mode=idle' },
  { route: '/spike/characters', step: 2, name: 'characters-02-lineup-work', query: '&mode=work' },
  {
    route: '/spike/characters',
    step: 4,
    name: 'characters-04-lineup-refuse',
    query: '&mode=refuse',
  },
  {
    route: '/spike/characters',
    step: 0,
    name: 'characters-00-lineup-greyscale',
    query: '&mode=idle&mono=1',
  },
  { route: '/spike/foundry', step: 0, name: 'foundry-00-bay-overview' },
  { route: '/spike/foundry', step: 3, name: 'foundry-03-file-edit' },
  { route: '/spike/foundry', step: 5, name: 'foundry-05-staging' },
  { route: '/spike/foundry', step: 6, name: 'foundry-06-commit-sealing', wait: 4500 },
  { route: '/spike/foundry', step: 9, name: 'foundry-09-handoff-prover', wait: 4500 },
  { route: '/spike/foundry', step: 13, name: 'foundry-13-checks' },
  { route: '/spike/foundry', step: 18, name: 'foundry-18-signature' },
  { route: '/spike/foundry', step: 19, name: 'foundry-19-handoff-keeper', wait: 4500 },
  { route: '/spike/foundry', step: 22, name: 'foundry-22-finding' },
  { route: '/spike/foundry', step: 24, name: 'foundry-24-safe-to-merge', wait: 4500 },
  { route: '/spike/foundry', step: 25, name: 'foundry-25-refused' },
  { route: '/spike/foundry', step: 0, name: 'foundry-00-bay-greyscale', query: '&mono=1' },
  {
    route: '/spike/foundry',
    step: 16,
    name: 'foundry-failed-16-unit-failed',
    query: '&run=failed',
  },
  {
    route: '/spike/foundry',
    step: 19,
    name: 'foundry-failed-19-quarantined',
    query: '&run=failed',
  },
  {
    route: '/spike/foundry',
    step: 6,
    name: 'foundry-06-reduced-motion-mobile',
    query: '&reduced=1&tier=mobile',
  },
  {
    route: '/spike/foundry',
    step: 24,
    name: 'foundry-24-reduced-motion-desktop',
    query: '&reduced=1',
  },
  { route: '/spike/mind', step: 0, name: 'mind-00-overview' },
  { route: '/spike/mind', step: 1, name: 'mind-01-gateway' },
  { route: '/spike/mind', step: 3, name: 'mind-03-hashed-sealed' },
  { route: '/spike/mind', step: 4, name: 'mind-04-non-destructive-read' },
  { route: '/spike/mind', step: 6, name: 'mind-06-provenance-tether' },
  { route: '/spike/mind', step: 7, name: 'mind-07-contested' },
  { route: '/spike/mind', step: 8, name: 'mind-08-durable-node' },
  { route: '/spike/mind', step: 9, name: 'mind-09-scan-finding' },
  {
    route: '/spike/mind',
    step: 8,
    name: 'mind-08-reduced-motion-mobile',
    query: '&reduced=1&tier=mobile',
  },
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
      await page.waitForTimeout(shot.wait ?? (shot.step === 0 ? 2500 : 3400));
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
        file: `docs/art-direction/phase-0-5/${shot.name}.png`,
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
