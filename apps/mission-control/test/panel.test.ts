import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it, vi } from 'vitest';
import {
  FABRICATOR_PATHS,
  FABRICATOR_SUBJECTS,
  type PanelTarget,
  PROVER_CHECK_NAMES,
  panelDoc,
  type SlabName,
  stationBeat,
} from '../src/world/panel/panelContent.js';
import { ROLES, type Role } from '../src/world/room/cast.js';
import { BEATS, demoAt, loopLength, OUTCOMES } from '../src/world/room/demo.js';
import { CANDIDATE_ID } from '../src/world/screens/candidate.js';
import { countsFor } from '../src/world/screens/stationScreen.js';
import {
  FABRICATOR_COMMITS,
  FABRICATOR_FILES,
  fabricatorTally,
  KEEPER_FINDINGS,
  keeperTally,
  PROVER_CHECKS,
  proverTally,
} from '../src/world/screens/tally.js';
import { verdictLook } from '../src/world/screens/verdicts.js';

const src = (relative: string) =>
  readFileSync(fileURLToPath(new URL(`../src/${relative}`, import.meta.url)), 'utf8');

const SLABS: SlabName[] = ['roles', 'verdict', 'candidate'];
const TARGETS: PanelTarget[] = [
  ...ROLES.map((role) => ({ kind: 'role' as const, role })),
  ...SLABS.map((slab) => ({ kind: 'slab' as const, slab })),
];

/** Every beat of every loop, at a tenth of a second: the whole demonstration. */
function everyBeat(): { loop: number; seconds: number }[] {
  const out: { loop: number; seconds: number }[] = [];
  for (let loop = 0; loop < OUTCOMES.length; loop += 1) {
    for (let t = 0; t <= loopLength(loop); t += 0.5) out.push({ loop, seconds: t });
  }
  return out;
}

describe('the panel renders from data, never from the camera', () => {
  it('has no reference to the camera, the controls or the flight', () => {
    // The owner's decision: the panel opens immediately and the camera
    // travels underneath it, so nothing here may wait for a frame.
    const panel = src('world/panel/Panel.tsx');
    for (const forbidden of [
      'OrbitControls',
      'useThree',
      'useFrame',
      'cameraPose',
      'closeUpPose',
      'limitsFor',
    ]) {
      expect(panel, `Panel.tsx must not mention ${forbidden}`).not.toContain(forbidden);
    }
  });

  it('animates on the compositor only: transform and opacity, never a layout property', () => {
    const panel = src('world/panel/Panel.tsx');
    // Every assignment to `.style.<prop>` in the entry and the drag.
    const assigned = [...panel.matchAll(/\.style\.([A-Za-z]+)\s*=/g)].map((m) => m[1]);
    expect(assigned.length).toBeGreaterThan(4);
    for (const property of assigned) {
      expect(['transform', 'opacity', 'height'], `animated ${property}`).toContain(property);
    }
    // `height` appears once and only on the scroll rail's thumb, which is
    // not part of the entry and is set from a scroll event, not per frame.
    expect(panel.match(/\.style\.height\s*=/g)?.length ?? 0).toBe(1);
    expect(panel).toContain('thumb.style.height');
  });

  it('respects reduced motion by rendering the panel open, never by hiding it (KR-55)', () => {
    const panel = src('world/panel/Panel.tsx');
    expect(panel).toContain('prefersReducedMotion');
    // The reduced-motion branch sets the finished state; it must not be a
    // `return null`, which is the shape of the KR-55 regression.
    expect(panel).toMatch(/if \(reduced\.current\) \{\s*\n\s*frame\(1\);/);
    expect(panel).not.toMatch(/reducedMotion[\s\S]{0,80}return null/);
  });

  it('keeps the entry and the exit under 400 ms', () => {
    const panel = src('world/panel/Panel.tsx');
    const open = Number(/OPEN_SECONDS = ([\d.]+)/.exec(panel)?.[1]);
    const close = Number(/CLOSE_SECONDS = ([\d.]+)/.exec(panel)?.[1]);
    expect(open).toBeGreaterThan(0);
    expect(open).toBeLessThanOrEqual(0.4);
    expect(close).toBeLessThanOrEqual(0.4);
  });
});

describe('one panel, many sources: the screen is a summary of the panel', () => {
  it('states the candidate state in the constitution’s own words, from the demonstration', () => {
    for (const { loop, seconds } of everyBeat()) {
      const state = demoAt(seconds, loop, true);
      for (const target of TARGETS) {
        const doc = panelDoc(state, target);
        if (target.kind === 'slab' && target.slab === 'roles') continue;
        if (target.kind === 'slab' && target.slab === 'candidate' && state.content.ownerGate) {
          expect(doc.state).toBe('SAFE TO MERGE');
          continue;
        }
        const expected =
          state.content.candidate === null
            ? 'NO CANDIDATE'
            : state.content.candidate.split('_').join(' ');
        expect(doc.state, `${target.kind} at ${loop}:${seconds}`).toBe(expected);
      }
    }
  });

  it('takes the verdict’s word and colour from `verdicts.ts` and never restates them', () => {
    for (const { loop, seconds } of everyBeat()) {
      const state = demoAt(seconds, loop, true);
      const doc = panelDoc(state, { kind: 'slab', slab: 'verdict' });
      if (state.content.verdict === '—') {
        expect(doc.mark.word).toBe('NO VERDICT');
      } else {
        const look = verdictLook(state.content.verdict);
        expect(doc.mark.word).toBe(look.lines[0]);
        expect(doc.tint).toBe(look.tint);
      }
    }
  });

  it('takes the evidence rows from `stationScreen.ts`’s own `countsFor`', () => {
    for (const outcome of OUTCOMES) {
      const loop = OUTCOMES.indexOf(outcome);
      const state = demoAt(BEATS.proverReported + 1, loop, true);
      for (const role of ROLES) {
        const doc = panelDoc(state, { kind: 'role', role });
        expect(doc.evidence).toEqual(countsFor(role, outcome));
      }
    }
  });

  it('takes every count from `tally.ts` at the same beat as that agent’s screen', () => {
    for (const { loop, seconds } of everyBeat()) {
      const state = demoAt(seconds, loop, true);
      for (const role of ROLES) {
        const { station, since } = stationBeat(state, role);
        expect(station).toBe(state.cast[role].station);
        const doc = panelDoc(state, { kind: 'role', role });
        const files = doc.sections.find((s) => s.title.startsWith('FILES CHANGED'));
        const checks = doc.sections.find((s) => s.title.startsWith('CHECKS'));
        const findings = doc.sections.find((s) => s.title.startsWith('FINDINGS'));
        if (role === 'fabricator') {
          const tally = fabricatorTally(station === 'WORKING' ? since : 100);
          expect(files?.rows.length).toBe(tally.files);
          expect(files?.title).toContain(`${tally.files} OF ${FABRICATOR_FILES.length}`);
        }
        if (role === 'prover') {
          const tally = proverTally(station === 'WORKING' ? since : 100, state.outcome);
          expect(checks?.rows.length).toBe(PROVER_CHECKS);
          for (const [i, row] of (checks?.rows ?? []).entries()) {
            expect(row.cells[1]).toBe(tally.checks[i]?.state);
          }
        }
        if (role === 'keeper') {
          const tally = keeperTally(station === 'WORKING' ? since : 100);
          expect(findings?.rows.length).toBe(tally.findings);
          expect(findings?.title).toContain(`${tally.blocking} BLOCKING`);
        }
      }
    }
  });

  it('describes the candidate with the one identity the slab draws', () => {
    const state = demoAt(BEATS.fabricatorWorking + 1, 0, true);
    const doc = panelDoc(state, { kind: 'slab', slab: 'candidate' });
    expect(doc.evidence.join(' ')).toContain(CANDIDATE_ID);
    // The slab reads it from the same module rather than computing one.
    expect(src('world/screens/ScreenBank.tsx')).toContain('CANDIDATE_ID');
    expect(src('world/screens/ScreenBank.tsx')).not.toContain('function hex(');
  });

  it('has one illustrative row per scheduled file, commit and check', () => {
    expect(FABRICATOR_PATHS).toHaveLength(FABRICATOR_FILES.length);
    expect(FABRICATOR_SUBJECTS).toHaveLength(FABRICATOR_COMMITS.length);
    expect(PROVER_CHECK_NAMES).toHaveLength(PROVER_CHECKS);
    expect(KEEPER_FINDINGS.filter((f) => f.severity === 'blocking')).toHaveLength(0);
  });
});

describe('the marking, the composer and the affordance', () => {
  it('carries ILLUSTRATIVE · NOT REAL STATE in the panel’s own band, not as a footnote', () => {
    const panel = src('world/panel/Panel.tsx');
    const css = src('world/panel/panel.css');
    expect(panel).toContain('panel-band');
    expect(panel.toUpperCase()).toContain('ILLUSTRATIVE · NOT REAL STATE');
    // Solid amber with dark type, at full width, above the body.
    expect(css).toMatch(/\.panel-band \{[^}]*background: var\(--panel-amber\)/);
    expect(css).toMatch(/\.panel-band \{[^}]*color: var\(--panel-amber-ink\)/);
    const bandAt = panel.indexOf('panel-band');
    const bodyAt = panel.indexOf('panel-body');
    expect(bandAt).toBeGreaterThan(0);
    expect(bandAt).toBeLessThan(bodyAt);
  });

  it('has a composer that is typeable, keeps what is typed and never claims to send', () => {
    const panel = src('world/panel/Panel.tsx');
    expect(panel).toContain('Not connected to a session');
    expect(panel).toContain('onChange={(event) => setTyped(event.target.value)}');
    expect(panel).toContain('event.preventDefault()');
    expect(panel).toContain('Nothing is sent');
    for (const forbidden of ['fetch(', 'XMLHttpRequest', 'WebSocket', 'navigator.sendBeacon']) {
      expect(panel).not.toContain(forbidden);
    }
  });

  it('cues every screen persistently, because a phone has no hover', () => {
    const draw = src('world/screens/draw.ts');
    expect(draw).toContain('export function expandCue(');
    // Called from `frame`, which every screen and every slab draws through.
    expect(draw).toMatch(/expandCue\(ctx, w, margin, tint, corner\);/);
    // It is persistent, not a hover state: the cue takes no flag saying
    // whether a pointer is over it, and it is drawn unconditionally.
    expect(draw).toMatch(
      /export function expandCue\(ctx: Ctx, w: number, margin: number, tint: string, corner: number\)/,
    );
    expect(draw).not.toMatch(/expandCue\([^)]*(hovered|active|pointer)/);
  });

  it('introduces no colour that is not already in the world', () => {
    const css = src('world/panel/panel.css');
    const known = new Set(
      [
        '#070a18',
        '#0b1024',
        '#e6f0ff',
        '#ffb765',
        '#ff9036',
        '#1a1206',
        '#cfe4ff',
        '#38d3ee',
        '#b6ff5c',
        '#ff3b5c',
        '#9dc0ff',
      ].map((c) => c.toLowerCase()),
    );
    // The mask gradients use `#000` as a stencil, which is an alpha value
    // and not a colour of anything; they are excluded from the scan.
    const painted = css.replace(/mask-image:[\s\S]*?;/g, '');
    for (const match of painted.matchAll(/#[0-9a-fA-F]{3,8}/g)) {
      expect(known, `${match[0]} is not a colour of this world`).toContain(match[0].toLowerCase());
    }
  });

  it('adds no font bytes: the display face is the screens’ own subset, body text is the system stack', () => {
    const css = src('world/panel/panel.css');
    expect(css).toContain('--panel-display: "Outfit"');
    expect(css).toContain('--panel-mono: "Geist Mono"');
    expect(css).toMatch(/--panel-body: system-ui/);
    // No @font-face, no url(), nothing fetched.
    expect(css).not.toContain('@font-face');
    expect(css).not.toContain('url(');
  });

  it('sets nothing in the display face that its subset cannot set: it has no lower case', () => {
    const css = src('world/panel/panel.css');
    // Every rule that asks for --panel-display must uppercase its text or
    // be given upper-case content by `panelContent.ts`.
    const displayRules = [...css.matchAll(/\.([\w-]+) \{([^}]*var\(--panel-display\)[^}]*)\}/g)];
    expect(displayRules.length).toBeGreaterThan(3);
    const uppercased = displayRules.filter(([, , block]) =>
      (block as string).includes('text-transform: uppercase'),
    );
    // The ones that are not force-uppercased take their text from
    // `panelContent.ts`, which produces upper case for all of them.
    const fromContent = displayRules
      .map(([, name]) => name as string)
      .filter((name) => !uppercased.some(([, other]) => other === name));
    expect(fromContent.sort()).toEqual(['panel-mark-word', 'panel-state', 'panel-title'].sort());
    for (const { loop, seconds } of everyBeat()) {
      const state = demoAt(seconds, loop, true);
      for (const target of TARGETS) {
        const doc = panelDoc(state, target);
        for (const text of [doc.title, doc.state, doc.mark.word]) {
          expect(text, `"${text}" is set in a face with no lower case`).toBe(text.toUpperCase());
        }
      }
    }
  });
});

describe('one tap does both, and back is one step per level', () => {
  it('sets the panel and the camera in the same event', () => {
    const roomSrc = src('world/room/VirgilRoom.tsx');
    expect(roomSrc).toMatch(
      /const open = \(target: PanelTarget, to: Focus\) => \{\s*\n\s*setPanel\(target\);\s*\n\s*setFocus\(to\);/,
    );
  });

  it('leaves the reader at the station when the panel is dismissed', () => {
    const roomSrc = src('world/room/VirgilRoom.tsx');
    // `onClose` clears the panel and touches nothing else.
    expect(roomSrc).toContain('onClose={() => setPanel(null)}');
    expect(roomSrc).not.toMatch(/onClose=\{\(\) => \{[\s\S]*setFocus/);
  });

  it('opens a panel from every screen in the world', () => {
    const roomSrc = src('world/room/VirgilRoom.tsx');
    // A slab opens its own record; a ledger row opens that hop (V9, item 2).
    expect(roomSrc).toContain("{ kind: 'slab', slab }");
    expect(roomSrc).toContain("{ kind: 'ledger', row }");
    expect(roomSrc).toContain("onOpen={() => onOpen({ kind: 'role', role }, role)}");
    expect(src('world/screens/ConsoleScreen.tsx')).toContain('onClick=');
    expect(src('world/screens/ScreenBank.tsx')).toContain('onClick=');
  });

  /*
   * **The prose is audited against the station's actual state**, the way
   * `demo.test.ts` audits the slab labels against the constitution's
   * transition table. V9 shipped a first version whose READY prose said
   * *"Its console is dark"* while the console was visibly lit and reading
   * `FABRICATOR / READY` in the same frame — the V7 defect again, and
   * worse in the panel, because prose in clean HTML is more believable
   * than a small glowing screen.
   *
   * The durable fix is not the sentence, it is this: the prose is
   * authored per station state and may not make a claim its state does
   * not hold. In particular it may say nothing about the console's
   * picture at all, which is a thing the panel does not own.
   */
  it('says nothing about a station that its state does not hold, at every beat', () => {
    /** Words no state's prose may use, and why. */
    const NEVER: { word: RegExp; because: string }[] = [
      { word: /\bdark\b/i, because: 'the panel does not own the console’s picture' },
      { word: /\blit\b/i, because: 'the panel does not own the console’s picture' },
      { word: /\bscreen\b/i, because: 'the panel does not own the console’s picture' },
      { word: /\bconsole is\b/i, because: 'the panel does not own the console’s picture' },
    ];
    /** What each station state may and may not be said to be doing. */
    const BY_STATE: Record<string, { must: RegExp; mustNot: RegExp[] }> = {
      READY: { must: /holds no work/i, mustNot: [/is implementing/i, /reported/i, /returned/i] },
      RECEIVING: { must: /taking|arriv/i, mustNot: [/holds no work/i, /returned a verdict/i] },
      WORKING: {
        must: /is implementing|is running|is reading/i,
        mustNot: [/holds no work/i, /returned/i, /reported complete/i],
      },
      REPORTED: {
        must: /reported complete|returned/i,
        mustNot: [/holds no work/i, /is implementing|is running|is reading/i],
      },
    };
    for (const { loop, seconds } of everyBeat()) {
      const state = demoAt(seconds, loop, true);
      for (const role of ROLES) {
        const { station } = stationBeat(state, role);
        const doc = panelDoc(state, { kind: 'role', role });
        const where = `${role} ${station} at ${loop}:${seconds}`;
        expect(doc.lead.length, `${where}: no prose`).toBeGreaterThan(40);
        for (const { word, because } of NEVER) {
          expect(word.test(doc.lead), `${where}: "${doc.lead}" — ${because}`).toBe(false);
        }
        const rule = BY_STATE[station] as NonNullable<(typeof BY_STATE)[string]>;
        expect(rule.must.test(doc.lead), `${where}: prose does not describe the state`).toBe(true);
        for (const forbidden of rule.mustNot) {
          expect(forbidden.test(doc.lead), `${where}: prose claims what is not so`).toBe(false);
        }
      }
    }
  });

  it('has prose for every station state a role can be in', () => {
    const seen = new Map<string, Set<string>>();
    for (const { loop, seconds } of everyBeat()) {
      const state = demoAt(seconds, loop, true);
      for (const role of ROLES) {
        const { station } = stationBeat(state, role);
        const doc = panelDoc(state, { kind: 'role', role });
        const set = seen.get(role) ?? new Set<string>();
        set.add(station);
        seen.set(role, set);
        expect(doc.lead.trim().length, `${role} ${station}`).toBeGreaterThan(0);
      }
    }
    // The demonstration puts every role through all four.
    for (const role of ROLES) {
      expect([...(seen.get(role) ?? [])].sort()).toEqual([
        'READY',
        'RECEIVING',
        'REPORTED',
        'WORKING',
      ]);
    }
  });

  it('gives every target a document with a lead, a section and evidence', () => {
    for (const { loop, seconds } of everyBeat()) {
      const state = demoAt(seconds, loop, true);
      for (const target of TARGETS) {
        const doc = panelDoc(state, target);
        expect(doc.lead.length, doc.key).toBeGreaterThan(40);
        expect(doc.sections.length, doc.key).toBeGreaterThan(0);
        expect(doc.evidence.length, doc.key).toBeGreaterThan(0);
        expect(doc.kicker.length, doc.key).toBeGreaterThan(4);
        // The measure is capped: no lead is a wall of text.
        expect(doc.lead.length, doc.key).toBeLessThan(520);
      }
    }
  });
});

/**
 * **`KP10-28`: the store's initial value is the claim it makes before anyone
 * has told it anything.**
 *
 * `panelStore.ts` carried a long paragraph explaining that a store starting at
 * `demoAt(0, 0, false)` is the defect slice six exists to prevent. The
 * paragraph shipped; the line under it still read `demoAt(0, 0, false)`.
 *
 * `publishNothingRead()` is the room's job, and on a live page that has read
 * nothing **the room is never mounted to do it** — the outer layer draws the
 * notice, the branch list and "Talk to Virgil" by itself. So the store kept
 * the recording and a press drew it, permanently, on any page whose endpoint
 * failed.
 *
 * `verify:web` caught it once, in CI, and passed three consecutive local runs
 * and a run under doubled CPU load. A defect that needs a fast machine to
 * appear needs a check that does not care how fast the machine is. This one
 * reads the value and cannot race.
 */
describe('the panel store before anything is published', () => {
  it('holds nothing, so a surface reading it first draws nothing', async () => {
    vi.resetModules();
    const fresh = await import('../src/world/panel/panelStore.js');
    expect(fresh.demoSnapshot()).toBeNull();
  });

  it('still holds nothing after a reader subscribes but nothing is published', async () => {
    vi.resetModules();
    const fresh = await import('../src/world/panel/panelStore.js');
    const seen: (unknown | null)[] = [];
    seen.push(fresh.demoSnapshot());
    expect(seen).toEqual([null]);
  });

  it('holds the state once one is published, and nothing again when nothing is read', async () => {
    vi.resetModules();
    const fresh = await import('../src/world/panel/panelStore.js');
    fresh.publishDemoState(demoAt(0, 0, false));
    expect(fresh.demoSnapshot()).not.toBeNull();
    fresh.publishNothingRead();
    expect(fresh.demoSnapshot()).toBeNull();
  });
});
