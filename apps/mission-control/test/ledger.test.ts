import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { ROLES } from '../src/world/room/cast.js';
import { BEATS, demoAt, loopLength, OUTCOMES, type Outcome } from '../src/world/room/demo.js';
import { BAND_HEIGHT } from '../src/world/screens/draw.js';
import {
  elapsedOf,
  HOPS,
  inFlight,
  isSettled,
  LEDGER_HEAD_PX,
  LEDGER_ROWS,
  LONGEST_HOP,
  ledgerAt,
  ledgerRowHeight,
  reportOf,
  rowAtUv,
} from '../src/world/screens/ledger.js';
import { slabPlan } from '../src/world/screens/ScreenBank.js';
import { verdictLook } from '../src/world/screens/verdicts.js';

const src = (relative: string) =>
  readFileSync(fileURLToPath(new URL(`../src/${relative}`, import.meta.url)), 'utf8');

/**
 * **The ledger (V9, item 2).** The owner's direction: a list of the agents
 * used and their outcomes, animating as it happens but persisting, so
 * state can be read at a glance by someone who looked away.
 *
 * The properties these hold are the ones that make it a ledger rather
 * than a status light, and each is one the demonstration could otherwise
 * violate silently.
 */

/** Every beat of every loop, at a tenth of a second. */
function beats(loop: number): number[] {
  const out: number[] = [];
  for (let t = 0; t <= loopLength(loop); t = Number((t + 0.1).toFixed(1))) out.push(t);
  return out;
}

describe('rows are appended and never rewritten', () => {
  it.each(OUTCOMES)('through the whole of a %s loop', (outcome) => {
    const loop = OUTCOMES.indexOf(outcome);
    let previous = ledgerAt(0, outcome);
    for (const t of beats(loop)) {
      const rows = ledgerAt(t, outcome);
      // The board only ever grows.
      expect(rows.length, `at ${t}s`).toBeGreaterThanOrEqual(previous.length);
      for (const [i, before] of previous.entries()) {
        const now = rows[i];
        expect(now, `at ${t}s: row ${i} vanished`).toBeTruthy();
        // Identity, order and start never change.
        expect(now?.role).toBe(before.role);
        expect(now?.startedAt).toBe(before.startedAt);
        // A report, once written, is never rewritten.
        if (before.report !== null) {
          expect(now?.report, `at ${t}s: row ${i}'s report was rewritten`).toBe(before.report);
          expect(now?.endedAt).toBe(before.endedAt);
        }
      }
      previous = rows;
    }
  });

  it('clears per candidate: a new loop starts an empty board', () => {
    for (const outcome of OUTCOMES) {
      expect(ledgerAt(0, outcome)).toHaveLength(0);
      // And it is full by the end of the loop it belongs to.
      const loop = OUTCOMES.indexOf(outcome);
      const settled = ledgerAt(loopLength(loop), outcome);
      expect(isSettled(settled, outcome)).toBe(true);
    }
  });

  it('shows a row for every hop the outcome reaches, and none it does not', () => {
    // A blocked or insufficient-evidence candidate never reaches review,
    // and the board must say so rather than leaving a third row blank.
    const passing = ledgerAt(BEATS.passEnd, 'PASS');
    expect(passing.map((row) => row.role)).toEqual([...ROLES]);
    for (const outcome of ['BLOCKED', 'INSUFFICIENT_EVIDENCE'] as Outcome[]) {
      const rows = ledgerAt(BEATS.otherEnd, outcome);
      expect(rows.map((row) => row.role)).toEqual(['fabricator', 'prover']);
    }
  });
});

describe('the board agrees with the world', () => {
  it('reports what each station reports, at the same beat', () => {
    for (const outcome of OUTCOMES) {
      const loop = OUTCOMES.indexOf(outcome);
      for (const t of beats(loop)) {
        const state = demoAt(t, loop, true);
        for (const row of ledgerAt(t, outcome)) {
          if (row.report === null) continue;
          const member = state.cast[row.role];
          // While the station still shows its report, the two must match;
          // once the station has gone quiet the board keeps the record,
          // which is the whole point of it.
          if (member.report !== '—') {
            expect(member.report, `${row.role} at ${t}s`).toBe(row.report);
          }
          expect(row.report).toBe(reportOf(row.role, outcome));
        }
      }
    }
  });

  it('takes its beats from `demo.ts` rather than restating them', () => {
    const starts = HOPS.map((hop) => hop.startedAt);
    const ends = HOPS.map((hop) => hop.endedAt);
    expect(starts).toEqual([
      BEATS.handoffToFabricator,
      BEATS.handoffToProver,
      BEATS.handoffToKeeper,
    ]);
    expect(ends).toEqual([BEATS.fabricatorReported, BEATS.proverReported, BEATS.keeperReported]);
    const ledger = src('world/screens/ledger.ts');
    expect(ledger).toContain("from '../room/demo.js'");
    // No literal second copies of the timeline.
    expect(ledger).not.toMatch(/startedAt: \d/);
    expect(ledger).not.toMatch(/endedAt: \d/);
  });

  it('gives every reported row the verdict’s own shape and colour', () => {
    for (const outcome of OUTCOMES) {
      const loop = OUTCOMES.indexOf(outcome);
      for (const row of ledgerAt(loopLength(loop), outcome)) {
        expect(row.report).not.toBeNull();
        const look = verdictLook(row.report ?? '—');
        expect(look.tint).toBeTruthy();
        // The four verdicts and the claim are distinguishable by shape,
        // which is what survives the wide view; `verdicts.ts` owns that.
        expect(look.lines[0]).toBeTruthy();
      }
    }
  });
});

describe('elapsed time is a column, and in flight is unresolved', () => {
  it('runs while a hop runs and stops when it reports', () => {
    const rows = ledgerAt(BEATS.fabricatorWorking, 'PASS');
    const live = rows[0];
    expect(live?.report).toBeNull();
    expect(elapsedOf(live as NonNullable<typeof live>, BEATS.fabricatorWorking)).toBeCloseTo(
      BEATS.fabricatorWorking - BEATS.handoffToFabricator,
      6,
    );
    // Once reported it is frozen: a finished board does not keep counting.
    const done = ledgerAt(BEATS.passEnd, 'PASS')[0];
    const first = elapsedOf(done as NonNullable<typeof done>, BEATS.passEnd);
    const later = elapsedOf(done as NonNullable<typeof done>, BEATS.passEnd + 30);
    expect(first).toBe(later);
    expect(first).toBe(BEATS.fabricatorReported - BEATS.handoffToFabricator);
  });

  it('never reads as blank while a hop is in flight', () => {
    for (const outcome of OUTCOMES) {
      const loop = OUTCOMES.indexOf(outcome);
      for (const t of beats(loop)) {
        const rows = ledgerAt(t, outcome);
        const open = inFlight(rows);
        if (open) {
          // An unresolved row still has a role, a start and a running
          // elapsed: there is always something to read.
          expect(open.role).toBeTruthy();
          expect(open.glyph).toHaveLength(1);
          expect(elapsedOf(open, t)).toBeGreaterThanOrEqual(0);
          expect(isSettled(rows, outcome)).toBe(false);
        }
      }
    }
  });

  it('measures every bar against the same longest hop, so two rows compare', () => {
    expect(LONGEST_HOP).toBe(Math.max(...HOPS.map((hop) => hop.endedAt - hop.startedAt)));
    for (const outcome of OUTCOMES) {
      const loop = OUTCOMES.indexOf(outcome);
      for (const row of ledgerAt(loopLength(loop), outcome)) {
        expect(elapsedOf(row, loopLength(loop))).toBeLessThanOrEqual(LONGEST_HOP);
      }
    }
  });
});

describe('a row can be opened, and the row hit is the row seen', () => {
  it('turns a point on the slab into the row drawn there', () => {
    const plan = slabPlan(1.3, 0.8);
    const canvasHeight = plan.canvasHeightPixels;
    const floor = canvasHeight - BAND_HEIGHT;
    const height = ledgerRowHeight(floor);
    expect(height).toBeGreaterThan(80);
    for (let row = 0; row < LEDGER_ROWS; row += 1) {
      // The middle of each row, converted to the texture coordinate the
      // raycast returns, comes back as that row.
      const y = LEDGER_HEAD_PX + row * height + height / 2;
      const uvY = 1 - y / canvasHeight;
      expect(rowAtUv(uvY, canvasHeight, floor), `row ${row}`).toBe(row);
    }
    // Above the first row and below the last is not a row: the title and
    // the honesty band are not clickable records.
    expect(rowAtUv(1 - (LEDGER_HEAD_PX - 20) / canvasHeight, canvasHeight, floor)).toBeNull();
    const past = LEDGER_HEAD_PX + LEDGER_ROWS * height + 4;
    expect(rowAtUv(1 - past / canvasHeight, canvasHeight, floor)).toBeNull();
  });

  it('is drawn through the same layout the click is read through', () => {
    const bank = src('world/screens/ScreenBank.tsx');
    expect(bank).toContain('ledgerRowHeight(floor)');
    expect(bank).toContain('const head = LEDGER_HEAD_PX;');
    expect(bank).toContain('rowAtUv(event.uv.y');
    // The old ROLES indicator is gone, not sitting beside the ledger.
    expect(bank).not.toContain('function drawRoles');
    expect(bank).not.toMatch(/const ROLES = \[/);
  });
});
