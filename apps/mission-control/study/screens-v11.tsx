/**
 * **The V11 screen study.**
 *
 * The V9 conversation panel came out well because it was designed as a
 * standalone study and iterated in a browser where a reload takes seconds,
 * rather than through a forty-minute owner build. This is that harness for
 * the four in-world displays, and it is committed rather than thrown away
 * because V10 recorded what throwing the last one away cost: when the
 * owner asked a follow-up question about the visors, the script that had
 * measured them could not be reproduced and a defect was left unfixed.
 *
 * It renders each display **at the texture resolution the world actually
 * gives it** on each tier, from the same `drawConsoleScreen` and `drawSlab`
 * the world calls, at the same aspect the model's own opening measures —
 * and then renders each one again **at the CSS size it occupies on a 390 px
 * portrait viewport**, downscaled by the browser's own filtering, which is
 * the only honest way to answer "is the primary state legible there".
 *
 * Open it with `node study/capture-screens-v11.mjs`, which builds it,
 * serves it and screenshots it into `scratchpad/study-v11-screens/`.
 */

import type { Role } from '../src/world/room/cast.js';
import type { Outcome, Report, ScreenContent, StationState } from '../src/world/room/demo.js';
import { setBandOnTwoLines } from '../src/world/screens/draw.js';
import { loadScreenFonts } from '../src/world/screens/fonts.js';
import { TEXTURE_WIDTH } from '../src/world/screens/v11/resolution.js';
import { drawConsoleScreen, drawSlab } from '../src/world/screens/v11/screens.js';

/**
 * The measured geometry of the six displays, as
 * `test/screen-geometry-v11.test.ts` computes it from the models' own
 * meshes. Copied here as constants because this page must not load a 3D
 * payload to draw a 2D picture; the test is the authority and fails if
 * these drift.
 */
const DISPLAYS = [
  {
    id: 'fabricator',
    kind: 'console' as const,
    aspect: 1.699,
    cornerFraction: 77.868 / 939.343,
    css: [43.4, 25.0],
    closeUp: [200.2, 117.4],
  },
  {
    id: 'prover',
    kind: 'console' as const,
    aspect: 1.8665,
    cornerFraction: 42.898 / 855.034,
    css: [36.6, 19.4],
    closeUp: [174.4, 93.3],
  },
  {
    id: 'keeper',
    kind: 'console' as const,
    aspect: 1.5146,
    cornerFraction: 81.107 / 871.564,
    css: [39.7, 25.8],
    closeUp: [177.2, 117.1],
  },
  {
    id: 'roles',
    kind: 'slab' as const,
    aspect: 1.486 / 0.986,
    cornerFraction: 0.025 / 1.486,
    css: [85.2, 53.6],
    closeUp: [326.4, 214.4],
  },
  {
    id: 'verdict',
    kind: 'slab' as const,
    aspect: 1.486 / 0.986,
    cornerFraction: 0.025 / 1.486,
    css: [83.2, 52.8],
    closeUp: [306.1, 206.6],
  },
  {
    id: 'candidate',
    kind: 'slab' as const,
    aspect: 1.486 / 0.986,
    cornerFraction: 0.025 / 1.486,
    css: [85.2, 53.6],
    closeUp: [367.8, 230.8],
  },
];

interface Moment {
  name: string;
  t: number;
  since: number;
  state: StationState;
  report: Report;
  outcome: Outcome;
  quiet: number;
  content: ScreenContent;
}

const MOMENTS: Moment[] = [
  {
    name: 'working',
    t: 11.2,
    since: 3.2,
    state: 'WORKING',
    report: '—',
    outcome: 'PASS',
    quiet: 0,
    content: { verdict: '—', active: 'Fabricator', candidate: 'BUILDING', ownerGate: false },
  },
  {
    name: 'receiving',
    t: 3.4,
    since: 1.4,
    state: 'RECEIVING',
    report: '—',
    outcome: 'PASS',
    quiet: 0,
    content: { verdict: '—', active: 'Fabricator', candidate: 'BUILDING', ownerGate: false },
  },
  {
    name: 'passed',
    t: 45.6,
    since: 1.6,
    state: 'REPORTED',
    report: 'PASS_WITH_NON_BLOCKING_FINDINGS',
    outcome: 'PASS',
    quiet: 0,
    content: {
      verdict: 'PASS_WITH_NON_BLOCKING_FINDINGS',
      active: null,
      candidate: 'SAFE_TO_MERGE',
      ownerGate: false,
    },
  },
  {
    name: 'blocked',
    t: 30.4,
    since: 1.5,
    state: 'REPORTED',
    report: 'BLOCKED',
    outcome: 'BLOCKED',
    quiet: 0,
    content: { verdict: 'BLOCKED', active: null, candidate: 'BLOCKED', ownerGate: false },
  },
  {
    name: 'insufficient',
    t: 30.4,
    since: 1.5,
    state: 'REPORTED',
    report: 'INSUFFICIENT_EVIDENCE',
    outcome: 'INSUFFICIENT_EVIDENCE',
    quiet: 0,
    content: {
      verdict: 'INSUFFICIENT_EVIDENCE',
      active: null,
      candidate: 'INSUFFICIENT_EVIDENCE',
      ownerGate: false,
    },
  },
  {
    name: 'standby',
    t: 8,
    since: 6,
    state: 'READY',
    report: '—',
    outcome: 'PASS',
    quiet: 0,
    content: { verdict: '—', active: null, candidate: null, ownerGate: false },
  },
  {
    name: 'owner-gate',
    t: 50,
    since: 2,
    state: 'READY',
    report: '—',
    outcome: 'PASS',
    quiet: 0.75,
    content: {
      verdict: 'PASS_WITH_NON_BLOCKING_FINDINGS',
      active: null,
      candidate: 'SAFE_TO_MERGE',
      ownerGate: true,
    },
  },
];

function canvasFor(width: number, aspect: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = Math.max(64, Math.round(width / aspect));
  return canvas;
}

function draw(display: (typeof DISPLAYS)[number], moment: Moment, canvas: HTMLCanvasElement) {
  const corner = display.cornerFraction * canvas.width;
  if (display.kind === 'console') {
    drawConsoleScreen(canvas, {
      role: display.id as Role,
      label: display.id[0]!.toUpperCase() + display.id.slice(1),
      state: moment.state,
      report: moment.report,
      outcome: moment.outcome,
      quiet: moment.quiet,
      corner,
      t: moment.t,
      since: moment.since,
    });
  } else {
    drawSlab(canvas, {
      kind: display.id as 'roles' | 'verdict' | 'candidate',
      content: moment.content,
      outcome: moment.outcome,
      seconds: moment.t,
      corner,
      t: moment.t,
      since: moment.since,
    });
  }
}

async function main() {
  await loadScreenFonts();
  const params = new URLSearchParams(window.location.search);
  const tier = (params.get('tier') ?? 'mobile') as keyof typeof TEXTURE_WIDTH;
  const only = params.get('only');
  const twoLine = params.get('band') !== 'one';
  setBandOnTwoLines(twoLine);
  const width = TEXTURE_WIDTH[tier] ?? 1024;
  const root = document.getElementById('study') as HTMLElement;
  const head = document.createElement('div');
  head.innerHTML =
    `<h1>V11 screen study — tier ${tier}, texture width ${width} px</h1>` +
    '<p class="note">Each display is drawn at the texture resolution the world gives it, then again at the CSS size it occupies on a 390 x 844 portrait viewport (gold outline) and at its close-up size. The small ones are what the owner sees from the overview; the large one is the texture. Every number shown is illustrative and every display says so on its own band.</p>';
  root.appendChild(head);
  for (const moment of MOMENTS) {
    if (only && only !== moment.name) continue;
    const section = document.createElement('section');
    const h2 = document.createElement('h2');
    h2.textContent = `${moment.name} — t ${moment.t}s, ${moment.since}s since the change`;
    section.appendChild(h2);
    const row = document.createElement('div');
    row.className = 'row';
    for (const display of DISPLAYS) {
      const texture = canvasFor(width, display.aspect);
      draw(display, moment, texture);
      const group = document.createElement('figure');
      // The texture, shown at a readable size on this page.
      const shown = document.createElement('canvas');
      const showW = 470;
      shown.width = showW;
      shown.height = Math.round(showW / display.aspect);
      shown.style.width = `${showW}px`;
      const sctx = shown.getContext('2d') as CanvasRenderingContext2D;
      sctx.imageSmoothingQuality = 'high';
      sctx.drawImage(texture, 0, 0, shown.width, shown.height);
      group.appendChild(shown);
      // The close-up size, and the overview size, side by side.
      const pair = document.createElement('div');
      pair.className = 'row';
      pair.style.gap = '10px';
      pair.style.marginTop = '8px';
      for (const [label, size] of [
        ['close-up', display.closeUp],
        ['overview', display.css],
      ] as [string, number[]][]) {
        const at = document.createElement('canvas');
        at.className = 'at-size';
        at.width = Math.round(size[0] as number);
        at.height = Math.round(size[1] as number);
        at.style.width = `${Math.round(size[0] as number)}px`;
        const actx = at.getContext('2d') as CanvasRenderingContext2D;
        actx.imageSmoothingQuality = 'high';
        actx.drawImage(texture, 0, 0, at.width, at.height);
        const wrap = document.createElement('figure');
        wrap.appendChild(at);
        const cap = document.createElement('figcaption');
        cap.textContent = `${label} ${Math.round(size[0] as number)}x${Math.round(size[1] as number)}`;
        wrap.appendChild(cap);
        pair.appendChild(wrap);
      }
      group.appendChild(pair);
      const caption = document.createElement('figcaption');
      caption.textContent = `${display.id} — texture ${texture.width} x ${texture.height}, aspect ${display.aspect.toFixed(3)}`;
      group.appendChild(caption);
      row.appendChild(group);
    }
    section.appendChild(row);
    root.appendChild(section);
  }
  (window as Window & { __studyReady?: boolean }).__studyReady = true;
}

void main();
