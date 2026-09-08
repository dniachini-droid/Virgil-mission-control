import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { CandidateState } from '@virgil/agent-contracts';
import { describe, expect, it } from 'vitest';
import authority from '../../../constitution/authority.json' with { type: 'json' };
import { tableShape } from '../src/world/panel/Panel.js';
import type { PanelSection, PanelTarget } from '../src/world/panel/panelContent.js';
import { panelDoc } from '../src/world/panel/panelContent.js';
import {
  BUILD_1_FROM,
  BUILD_1_SECONDS,
  CANDIDATES,
  CHECKS_CANDIDATE_1,
  CHECKS_CANDIDATE_2,
  FINDINGS_REVIEW_1,
  FINDINGS_REVIEW_2,
  RESOLVED_BY_REPAIR,
  RUN,
  RUN_SECONDS,
  recordedClock,
  recordedDuration,
  secondsBetween,
  WINDOWS,
} from '../src/world/replay/recordedRun.js';
import {
  compressionOf,
  currentBeat,
  evidenceFor,
  hopsOf,
  PLAYBACK_SECONDS,
  playbackSchedule,
  playbackSecondsOf,
  REPLAY_BEATS,
  REPLAY_SPEEDS,
  type ReplaySpeed,
  replayAt,
  replayLedgerAt,
  replayLength,
  shaShownAt,
  speedLabel,
} from '../src/world/replay/replayTimeline.js';
import { ROLES } from '../src/world/room/cast.js';
import {
  BAND_LINES,
  BAND_WORDS,
  bandLines,
  REPLAY_BAND_LINES,
  REPLAY_BAND_WORDS,
  setBandOnTwoLines,
  setBandReplay,
} from '../src/world/screens/draw.js';

/**
 * **The replay of a real run** (V10). The scripted demonstration is held
 * coherent by `demo.test.ts`; a replay has to be held to something
 * stronger, because it claims to be true.
 *
 * The four properties this file exists for:
 *
 *  1. **No verdict is shown on a hop that did not have one.** That is the
 *     defect the owner caught in V7 and the coordinator caught again in
 *     V9, and it would be worst here, where everything else is true. Every
 *     verdict in the replay is one the record has, on the SHA the record
 *     has it on, and no reviewer's verdict appears before its review
 *     reported.
 *  2. **Recorded time is never playback time.** A compressed clock that
 *     reported compressed durations would be a lie about how long the work
 *     took. Changing the speed must move every playback figure and no
 *     recorded one.
 *  3. **Every state change is a transition the constitution allows** —
 *     the same bar `demo.test.ts` sets, over a longer and real sequence
 *     that includes a repair round.
 *  4. **Every document names where its content came from.**
 */

const src = (relative: string) =>
  readFileSync(fileURLToPath(new URL(`../src/${relative}`, import.meta.url)), 'utf8');

const transitions = authority.transitions as { from: string; to: string }[];
const CANDIDATE_1 = CANDIDATES[0] as (typeof CANDIDATES)[number];
const CANDIDATE_2 = CANDIDATES[1] as (typeof CANDIDATES)[number];

/** Every tenth of a playback second of the whole replay, at one speed. */
function everyMoment(speed: ReplaySpeed): number[] {
  const out: number[] = [];
  for (let t = 0; t < replayLength(speed); t += 0.1) out.push(t);
  return out;
}

describe('the recorded run is read out of the repository, not invented', () => {
  it('carries the run’s own instants, and its windows cover it exactly', () => {
    expect(RUN_SECONDS).toBe(90 * 60);
    expect(recordedDuration(RUN_SECONDS)).toBe('1 H 30 M');
    // The four windows partition the run: no gap, no overlap, no remainder.
    let at: string = RUN.startedAt;
    let total = 0;
    for (const window of WINDOWS) {
      expect(window.from).toBe(at);
      total += secondsBetween(window.from, window.to);
      at = window.to;
    }
    expect(at).toBe(RUN.completedAt);
    expect(total).toBe(RUN_SECONDS);
  });

  it('has the real SHAs, and the merge is the second candidate’s child', () => {
    expect(CANDIDATE_2.sha).toBe('3b9a964e7de4c53560fd3128090cdba39b005c6c');
    expect(CANDIDATE_1.sha).toBe('956be26064171f53022f92fc4429770bb727eaa5');
    expect(RUN.mergeSha.startsWith('cd0981d')).toBe(true);
    // The short forms the slabs show are prefixes of the real SHAs.
    for (const candidate of CANDIDATES) {
      expect(candidate.sha.startsWith(candidate.short)).toBe(true);
      expect(candidate.short).toHaveLength(10);
    }
    // The candidate commit is inside the window that closes with it.
    expect(CANDIDATE_1.committedAt).toBe(WINDOWS[0]?.to);
    expect(CANDIDATE_2.committedAt).toBe(WINDOWS[1]?.to);
    expect(RUN.mergedAt).toBe(WINDOWS[2]?.to);
  });

  it('records the build’s duration from its own two commit stamps', () => {
    expect(BUILD_1_SECONDS).toBe(secondsBetween(BUILD_1_FROM, CANDIDATE_1.committedAt));
    expect(recordedDuration(BUILD_1_SECONDS)).toBe('24 M 57 S');
    expect(recordedClock(BUILD_1_FROM)).toBe('06 SEP 23:37 UTC');
    expect(recordedClock(CANDIDATE_1.committedAt)).toBe('07 SEP 00:02 UTC');
  });

  it('gives the checks and the findings the record’s own counts', () => {
    // Nine checks on the first candidate, every one of them passed. This
    // is the fact the whole replay exists to show, next to a BLOCKED
    // review, so it is asserted rather than left to the data.
    expect(CHECKS_CANDIDATE_1).toHaveLength(9);
    expect(CHECKS_CANDIDATE_1.every((check) => check.result === 'passed')).toBe(true);
    expect(CHECKS_CANDIDATE_2.filter((c) => c.result === 'passed')).toHaveLength(9);
    expect(CHECKS_CANDIDATE_2.filter((c) => c.result === 'skipped')).toHaveLength(3);
    // No skipped check on the second candidate was required, so no gap
    // could hide a failure behind one.
    for (const check of CHECKS_CANDIDATE_2) {
      if (check.result === 'skipped') expect(check.required).toBe(false);
      expect(check.evidence.length).toBeGreaterThan(8);
    }
    // Ten findings on the first review, two blocking; four on the second,
    // none blocking, and every one of the four is one of the ten.
    expect(FINDINGS_REVIEW_1).toHaveLength(10);
    expect(FINDINGS_REVIEW_1.filter((f) => f.severity === 'blocking')).toHaveLength(2);
    expect(FINDINGS_REVIEW_2).toHaveLength(4);
    expect(FINDINGS_REVIEW_2.filter((f) => f.severity === 'blocking')).toHaveLength(0);
    for (const finding of FINDINGS_REVIEW_2) {
      expect(FINDINGS_REVIEW_1.map((f) => f.id)).toContain(finding.id);
    }
    // The four the repair resolved and the four still open are disjoint.
    for (const id of RESOLVED_BY_REPAIR) {
      expect(FINDINGS_REVIEW_2.map((f) => f.id)).not.toContain(id);
    }
    expect(FINDINGS_REVIEW_2.map((f) => f.id)).toEqual(['KR-03', 'KR-06', 'KR-07', 'KR-09']);
  });
});

describe('no verdict is shown on a hop that did not have one', () => {
  it('shows a reviewer’s verdict only from the beat its review reported', () => {
    const index = new Map(REPLAY_BEATS.map((beat, i) => [beat.id, i]));
    const blockedFrom = index.get('k1-reported') as number;
    const passFrom = index.get('k2-reported') as number;
    REPLAY_BEATS.forEach((beat, i) => {
      if (beat.verdict === 'BLOCKED') {
        expect(i, `${beat.id} shows BLOCKED before the review returned it`).toBeGreaterThanOrEqual(
          blockedFrom,
        );
      }
      if (beat.verdict === 'PASS_WITH_NON_BLOCKING_FINDINGS') {
        expect(i, `${beat.id} shows the second verdict too early`).toBeGreaterThanOrEqual(passFrom);
      }
      // And INSUFFICIENT_EVIDENCE never appears: this run never got one.
      expect(beat.verdict).not.toBe('INSUFFICIENT_EVIDENCE');
    });
  });

  it('gives each review hop exactly the verdict the record gives it', () => {
    expect(hopsOf(0).map((hop) => `${hop.label}:${hop.report}`)).toEqual([
      'FABRICATOR:COMPLETE',
      'CHECKS:PASS',
      'REVIEW:BLOCKED',
    ]);
    expect(hopsOf(1).map((hop) => `${hop.label}:${hop.report}`)).toEqual([
      'REPAIR:COMPLETE',
      'CHECKS:PASS',
      'REVIEW:PASS_WITH_NON_BLOCKING_FINDINGS',
    ]);
    // The builder never reports a verdict: COMPLETE is a claim.
    for (const segment of [0, 1] as const) {
      const build = hopsOf(segment)[0];
      expect(build?.report).toBe('COMPLETE');
    }
  });

  it('never shows the second SHA before the commit that made it', () => {
    // The repair is authorised on the first candidate and does not produce
    // the second SHA until it commits, so a label ahead of its fact is the
    // V7 defect. The board clears with the hop; the identity follows the
    // commit.
    expect(shaShownAt(REPLAY_BEATS[10] as never).short).toBe(CANDIDATE_1.short);
    for (const beat of REPLAY_BEATS) {
      if (beat.id === 'f2-receiving' || beat.id === 'f2-working') {
        expect(shaShownAt(beat).short).toBe(CANDIDATE_1.short);
        expect(beat.segment).toBe(1);
      }
    }
    const afterCommit = REPLAY_BEATS.find((beat) => beat.id === 'f2-reported') as never;
    expect(shaShownAt(afterCommit).short).toBe(CANDIDATE_2.short);
  });

  it('keeps a blocked verdict until a new SHA exists, and then shows none', () => {
    const verdictOf = (id: string) => REPLAY_BEATS.find((beat) => beat.id === id)?.verdict;
    expect(verdictOf('k1-reported')).toBe('BLOCKED');
    expect(verdictOf('owner-repair')).toBe('BLOCKED');
    expect(verdictOf('f2-working')).toBe('BLOCKED');
    // The repair produced a new candidate: the old verdict does not apply
    // to it, and the slab says so rather than carrying one over.
    expect(verdictOf('f2-reported')).toBe('—');
    expect(verdictOf('p2-working')).toBe('—');
  });
});

describe('recorded time is never playback time', () => {
  it('gives one hop of nine a recorded duration and eight of them none', () => {
    const all = [...hopsOf(0), ...hopsOf(1)];
    const recorded = all.filter((hop) => hop.recordedSeconds !== null);
    expect(all).toHaveLength(6);
    expect(recorded).toHaveLength(1);
    expect(recorded[0]?.recordedSeconds).toBe(BUILD_1_SECONDS);
    // With the three owner beats that is nine hops and one duration.
    expect(all.length + 3).toBe(9);
  });

  it('prints NOT RECORDED rather than a number, and draws no bar for it', () => {
    for (const speed of REPLAY_SPEEDS) {
      for (const t of everyMoment(speed)) {
        for (const row of replayLedgerAt(t, speed)) {
          expect(row.recorded, 'every replay row carries recorded time').toBeDefined();
          const recorded = row.recorded as { seconds: number | null; text: string };
          if (recorded.seconds === null) {
            expect(recorded.text).toBe('NOT RECORDED');
          } else {
            expect(recorded.seconds).toBe(BUILD_1_SECONDS);
            expect(recorded.text).toBe(recordedDuration(BUILD_1_SECONDS));
          }
        }
      }
    }
  });

  it('moves every playback figure with the speed and no recorded one', () => {
    const recordedAt = (speed: ReplaySpeed) =>
      everyMoment(speed)
        .flatMap((t) => replayLedgerAt(t, speed))
        .map((row) => `${row.label}:${row.recorded?.text}`);
    const slow = new Set(recordedAt('slow'));
    const fastest = new Set(recordedAt('fastest'));
    expect([...slow].sort()).toEqual([...fastest].sort());
    // And the playback clock does move: the same beat is on screen for
    // six times as long at the slowest speed as at the fastest.
    const beat = REPLAY_BEATS[1] as (typeof REPLAY_BEATS)[number];
    expect(playbackSecondsOf(beat, 'slow') / playbackSecondsOf(beat, 'fastest')).toBeCloseTo(6, 5);
  });

  it('derives the compression from the two clocks instead of asserting it', () => {
    for (const speed of REPLAY_SPEEDS) {
      expect(compressionOf(speed)).toBe(Math.round(RUN_SECONDS / PLAYBACK_SECONDS[speed]));
      expect(speedLabel(speed)).toBe(`${compressionOf(speed)}×`);
    }
    expect(compressionOf('fast')).toBe(90);
    expect(compressionOf('fastest')).toBe(180);
    expect(compressionOf('slow')).toBe(30);
    // Fast by default, because that is what the owner asked for, and
    // slowable, because he has to be able to look at a beat.
    expect(src('world/replay/replayTimeline.ts')).toContain(
      "export const DEFAULT_SPEED: ReplaySpeed = 'fast'",
    );
  });

  it('spends the whole playback length and no more', () => {
    for (const speed of REPLAY_SPEEDS) {
      const schedule = playbackSchedule(speed);
      expect(schedule[0]?.at).toBe(0);
      const last = schedule[schedule.length - 1] as {
        beat: (typeof REPLAY_BEATS)[number];
        at: number;
      };
      expect(last.at + playbackSecondsOf(last.beat, speed)).toBeCloseTo(replayLength(speed), 6);
      // Every beat is reachable: none is squeezed to nothing.
      for (const entry of schedule) {
        expect(playbackSecondsOf(entry.beat, speed)).toBeGreaterThan(0.3);
      }
    }
  });

  it('never reports a playback duration as a duration of the work', () => {
    // The ledger's `startedAt` and `endedAt` are playback seconds in the
    // replay, and the drawing must read the time column off `recorded`
    // and never off them.
    const bank = src('world/screens/ScreenBank.tsx');
    expect(bank).toContain('row.recorded ? row.recorded.text');
    expect(bank).toContain(
      'const bar = row.recorded ? row.recorded.seconds : elapsedOf(row, seconds)',
    );
    // And a row with no recorded duration gets no bar at all.
    expect(bank).toContain('if (bar !== null) {');
  });
});

describe('every state change is a transition the constitution allows', () => {
  it('walks the whole run against authority.json’s table', () => {
    let previous: string | null = null;
    for (const beat of REPLAY_BEATS) {
      const candidate = beat.candidate;
      if (candidate !== null) expect(CandidateState.options).toContain(candidate);
      if (previous !== null && candidate !== null && candidate !== previous) {
        expect(
          transitions.some((x) => x.from === previous && x.to === candidate),
          `${previous} → ${candidate} at beat ${beat.id}`,
        ).toBe(true);
      }
      previous = candidate;
    }
  });

  it('passes through the states this run really passed through', () => {
    const seen: string[] = [];
    for (const beat of REPLAY_BEATS) {
      if (beat.candidate && seen[seen.length - 1] !== beat.candidate) seen.push(beat.candidate);
    }
    expect(seen).toEqual([
      'BUILDING',
      'BUILDER_REPORTED_COMPLETE',
      'VERIFICATION_INCOMPLETE',
      'READY_FOR_REVIEW',
      'REVIEW_IN_PROGRESS',
      'BLOCKED',
      'REPAIR_AUTHORISED',
      'RE_REVIEW_REQUIRED',
      'VERIFICATION_INCOMPLETE',
      'READY_FOR_REVIEW',
      'REVIEW_IN_PROGRESS',
      'PASS_WITH_NON_BLOCKING_FINDINGS',
      'SAFE_TO_MERGE',
      'MERGED',
    ]);
  });

  it('refuses on the blocked verdict and only there', () => {
    for (const beat of REPLAY_BEATS) {
      if (beat.pose === 'blocked') expect(beat.verdict).toBe('BLOCKED');
      if (beat.virgilFace === 'blocked') expect(beat.verdict).toBe('BLOCKED');
    }
    const blocked = REPLAY_BEATS.find((beat) => beat.id === 'k1-reported');
    expect(blocked?.pose).toBe('blocked');
    expect(blocked?.virgilFace).toBe('blocked');
  });

  it('appends rows and never rewrites one, over the whole replay', () => {
    for (const speed of REPLAY_SPEEDS) {
      const written = new Map<string, string>();
      let lastSegment = -1;
      for (const t of everyMoment(speed)) {
        const segment = currentBeat(t, speed).segment;
        // The board clears per candidate, which is the owner's decision.
        if (segment !== lastSegment) {
          written.clear();
          lastSegment = segment;
        }
        for (const row of replayLedgerAt(t, speed)) {
          const key = `${segment}:${row.role}:${row.label}`;
          const shape = `${row.glyph}|${row.startedAt}|${row.endedAt}|${row.report}|${row.recorded?.text}`;
          const before = written.get(key);
          if (before !== undefined && before !== shape) {
            // The only permitted change is an unresolved row resolving.
            expect(before.split('|')[3], `${key} was rewritten at ${t.toFixed(1)} s`).toBe('null');
          }
          written.set(key, shape);
        }
      }
    }
  });
});

describe('the honesty band says what the thing actually is', () => {
  it('names the run, says it is replayed, and says it is not live state', () => {
    expect(REPLAY_BAND_LINES).toHaveLength(3);
    expect(REPLAY_BAND_WORDS).toBe(REPLAY_BAND_LINES.join(' · '));
    const joined = REPLAY_BAND_LINES.join(' ');
    expect(joined).toContain('PHASE 0 CONSOLIDATION');
    expect(joined).toContain('RECORDED RUN');
    expect(joined).toContain('REPLAYED');
    // The half that does the work: it is not this repository's state now.
    expect(joined).toContain('NOT LIVE STATE');
    // And the candidate, so the run is identifiable from the band alone.
    expect(joined).toContain(CANDIDATE_2.short.slice(0, 8).toUpperCase());
  });

  it('sets nothing the display subset cannot set', () => {
    // Outfit Bold's subset has no lower case, and no font byte is added.
    const subset = ' !"#%&\'()*+,-./0123456789:;<=>?ABCDEFGHIJKLMNOPQRSTUVWXYZ[]_|·–—';
    for (const line of REPLAY_BAND_LINES) {
      expect(line).toBe(line.toUpperCase());
      for (const ch of line) {
        expect(subset, `the band sets ${ch}, which the subset has no glyph for`).toContain(ch);
      }
    }
  });

  it('is switched by the mode, once, and the demonstration’s band is untouched', () => {
    const room = src('world/room/VirgilRoom.tsx');
    expect(room).toContain("setBandReplay(mode === 'replay')");
    setBandReplay(false);
    setBandOnTwoLines(false);
    expect(bandLines()).toEqual([BAND_WORDS]);
    setBandOnTwoLines(true);
    expect(bandLines()).toEqual(BAND_LINES);
    setBandReplay(true);
    // The replay's band wins over the tier's layout: it has its own.
    expect(bandLines()).toEqual(REPLAY_BAND_LINES);
    setBandReplay(false);
    setBandOnTwoLines(false);
    // The two sentences are each declared exactly once.
    const draw = src('world/screens/draw.ts');
    expect(draw.match(/'ILLUSTRATIVE · NOT REAL STATE'/g) ?? []).toHaveLength(1);
    expect(draw.match(/'NOT LIVE STATE · 3B9A964E'/g) ?? []).toHaveLength(1);
  });

  it('keeps the badge unhideable and unmistakable between the two modes', () => {
    const room = src('world/room/VirgilRoom.tsx');
    // Two badges, one per mode, and neither is optional while a run plays.
    expect(room).toContain("demo && mode === 'replay'");
    expect(room).toContain("demo && mode === 'demo'");
    expect(room).toContain('RECORDED RUN, REPLAYED AT');
    expect(room).toContain('SCRIPTED DEMONSTRATION');
    // The replay's badge reads differently at a glance, in the world's
    // own ice rather than the demonstration's amber.
    const css = src('owner/owner.css');
    expect(css).toMatch(/\.room-demo-badge\.is-recorded \{[^}]*color: var\(--ice\)/);
  });
});

describe('the panel carries the run, and says where every figure came from', () => {
  const targets: PanelTarget[] = [
    ...ROLES.map((role) => ({ kind: 'role' as const, role })),
    { kind: 'slab', slab: 'roles' },
    { kind: 'slab', slab: 'verdict' },
    { kind: 'slab', slab: 'candidate' },
    { kind: 'ledger', row: 0 },
    { kind: 'ledger', row: 1 },
    { kind: 'ledger', row: 2 },
  ];

  it('names a document, a section and a commit on every document, at every beat', () => {
    for (const speed of REPLAY_SPEEDS) {
      for (const t of everyMoment(speed)) {
        const state = replayAt(t, speed, true);
        for (const target of targets) {
          const doc = panelDoc(state, target);
          expect(doc.provenance, `${doc.key} has no provenance`).toBeDefined();
          const sources = doc.provenance as { document: string; section: string; commit: string }[];
          expect(sources.length).toBeGreaterThan(0);
          for (const source of sources) {
            expect(source.document.length).toBeGreaterThan(2);
            expect(source.section.length).toBeGreaterThan(2);
            // A commit, or the history itself.
            expect(source.commit).toMatch(/^[0-9a-f]{7,40}$/);
          }
        }
      }
    }
  });

  it('carries the recorded band and not the illustrative one', () => {
    const state = replayAt(0, 'fast', true);
    const doc = panelDoc(state, { kind: 'slab', slab: 'roles' });
    expect(doc.band?.title).toBe('Recorded run · replayed · not live state');
    expect(doc.band?.note).toContain('read out of this repository’s committed record');
    expect(doc.band?.note).toContain('not this repository’s state now');
    // And the demonstration's band is exactly as it was.
    const panel = src('world/panel/Panel.tsx');
    expect(panel.toUpperCase()).toContain('ILLUSTRATIVE · NOT REAL STATE');
    expect(panel).toContain('doc.band ? (');
    expect(panel).toContain('Where this comes from');
  });

  it('sets nothing in the display face that its subset cannot set', () => {
    for (const speed of REPLAY_SPEEDS) {
      for (const t of everyMoment(speed)) {
        const state = replayAt(t, speed, true);
        for (const target of targets) {
          const doc = panelDoc(state, target);
          for (const text of [doc.title, doc.state, doc.mark.word]) {
            expect(text, `"${text}" is set in a face with no lower case`).toBe(text.toUpperCase());
          }
        }
      }
    }
  });

  it('states the one recorded duration and refuses the other eight', () => {
    const state = replayAt(0, 'fast', true);
    const build = panelDoc(state, { kind: 'role', role: 'fabricator' });
    const howLong = build.sections.find((s) => s.title === 'HOW LONG IT TOOK');
    expect(howLong?.rows[0]?.cells[0]).toContain('24 M 57 S');
    expect(howLong?.rows[0]?.cells[0]).toContain('only hop of the nine');
    for (const role of ['prover', 'keeper'] as const) {
      const doc = panelDoc(state, { kind: 'role', role });
      const section = doc.sections.find((s) => s.title === 'HOW LONG IT TOOK');
      expect(section?.rows[0]?.cells[0]).toContain('NOT RECORDED');
    }
  });

  it('tells the owner the two things this replay reveals about the project', () => {
    const doc = panelDoc(replayAt(0, 'fast', true), { kind: 'slab', slab: 'roles' });
    const what = doc.sections.find((s) => s.title === 'WHAT THIS REPLAY SAYS ABOUT THE PROJECT');
    const text = (what?.rows ?? []).map((row) => row.cells[0]).join(' ');
    // The green checks and the blocking review.
    expect(text).toContain('all green on the first candidate and the independent review blocked');
    // And the hop Phase 1 has not had.
    expect(text).toContain('V6 to V9 have had no independent review at all');
    expect(text).toContain('no recorded duration');
  });

  it('does not read the checks as an independent verification', () => {
    const doc = panelDoc(replayAt(0, 'fast', true), { kind: 'role', role: 'prover' });
    const who = doc.sections.find((s) => s.title === 'WHO RAN THEM');
    expect(who?.rows[0]?.cells[0]).toContain('The building session ran them');
  });
});

describe('the replay reuses the world and adds no second renderer', () => {
  it('produces the same DemoState shape the demonstration does', () => {
    const state = replayAt(replayLength('fast') / 2, 'fast', true);
    expect(state.mode).toBe('replay');
    expect(Object.keys(state.cast).sort()).toEqual([...ROLES].sort());
    expect(state.content.candidateId).toMatch(/^[0-9a-f]{10}$/);
    expect(state.content.evidence?.length).toBe(3);
    // The station that is working carries the record's own counts.
    const working = ROLES.map((role) => state.cast[role]).find((m) => m.work);
    if (working) expect(working.work?.counts.length).toBe(2);
  });

  it('draws both modes through one drawStation and one drawLedger', () => {
    const station = src('world/screens/stationScreen.ts');
    // One entry point, taking the work as data.
    expect(station.match(/export function drawStation\(/g) ?? []).toHaveLength(1);
    expect(station).toContain('work?: HopWork');
    const bank = src('world/screens/ScreenBank.tsx');
    expect(bank.match(/function drawLedger\(/g) ?? []).toHaveLength(1);
    expect(bank).toContain("mode === 'replay' ? replayLedgerAt(seconds, speed) : ledgerAt(");
    // And no font byte is added: the replay imports no font payload.
    for (const file of [
      'world/replay/recordedRun.ts',
      'world/replay/replayTimeline.ts',
      'world/replay/replayContent.ts',
    ]) {
      expect(src(file)).not.toContain('.b64.txt');
      expect(src(file)).not.toContain('FontFace');
      expect(src(file)).not.toContain('@font-face');
    }
  });

  it('publishes the clock the captures poll, and takes an entry point', () => {
    const hook = src('world/replay/useReplay.ts');
    expect(hook).toContain('__virgilDemo');
    expect(hook).toContain('Math.min(delta, 0.1)');
    const room = src('world/room/VirgilRoom.tsx');
    expect(room).toContain("query().get('run') === 'replay'");
    expect(room).toContain("query().get('speed')");
  });

  it('keeps the scripted demonstration selectable and unchanged', () => {
    const room = src('world/room/VirgilRoom.tsx');
    expect(room).toContain('>\n              Scripted\n            </button>');
    expect(room).toContain('>\n              Replay\n            </button>');
    // The demonstration's own state is still produced by `useDemo`.
    expect(room).toContain("useDemo(demo && forced === null && mode === 'demo')");
  });

  it('gives every beat one line of what the record says happened', () => {
    for (const beat of REPLAY_BEATS) {
      expect(beat.what.length).toBeGreaterThan(20);
      expect(evidenceFor(beat)).toHaveLength(3);
    }
  });
});

/**
 * **The V10 repair: a table the reader can finish.**
 *
 * The replay's documents were the first in this panel to carry tables of
 * three and four columns and prose inside them. Every table until then was
 * a label and a value, and the CSS that suited that shape — the first
 * column absorbs the slack and ellipsises, the last sits against the right
 * edge — collapsed the new tables' first column to 14 px and pushed their
 * last column off the edge of the window. Measured in the built artifact
 * at 1280 × 800: a finding's `KR-01` was given 14 px of the 52 px it
 * needs, the provenance's `docs/process/run-records/consolidation.run-record.json`
 * 14 px of 419 px, and the findings table was 876 px wide inside a 614 px
 * panel, so its DISPOSITION column could not be seen at all.
 *
 * These hold the repair in place. A document that says where every figure
 * comes from, in a column too narrow to show it, does not say it.
 */
describe('the panel’s tables can be read to their end', () => {
  const targets: PanelTarget[] = [
    ...ROLES.map((role) => ({ kind: 'role' as const, role })),
    { kind: 'slab', slab: 'roles' },
    { kind: 'slab', slab: 'verdict' },
    { kind: 'slab', slab: 'candidate' },
    { kind: 'ledger', row: 0 },
    { kind: 'ledger', row: 1 },
    { kind: 'ledger', row: 2 },
  ];
  const everyTable = () => {
    const out: { key: string; title: string; section: PanelSection }[] = [];
    for (const speed of REPLAY_SPEEDS) {
      for (const t of everyMoment(speed)) {
        const state = replayAt(t, speed, true);
        for (const target of targets) {
          const doc = panelDoc(state, target);
          for (const section of doc.sections) {
            if (section.kind === 'table') out.push({ key: doc.key, title: section.title, section });
          }
        }
      }
    }
    return out;
  };

  it('puts the two-column layout on a pair and on nothing else', () => {
    let pairs = 0;
    let columns = 0;
    for (const { key, title, section } of everyTable()) {
      const width = Math.max(
        section.head?.length ?? 0,
        ...section.rows.map((row) => row.cells.length),
      );
      const shape = tableShape(section);
      expect(shape, `${key} · ${title} has ${width} columns`).toBe(
        width === 2 ? 'panel-table-pairs' : 'panel-table-columns',
      );
      if (shape === 'panel-table-pairs') pairs += 1;
      else columns += 1;
    }
    // Both layouts are in use, so neither assertion is vacuous.
    expect(pairs).toBeGreaterThan(0);
    expect(columns).toBeGreaterThan(0);
  });

  it('never puts a cell of prose in the layout that ellipsises its first column', () => {
    for (const { key, title, section } of everyTable()) {
      if (tableShape(section) !== 'panel-table-pairs') continue;
      for (const row of section.rows) {
        // A pair's first column is the label; a label is short. Anything
        // long enough to be a sentence or a path belongs in a layout that
        // wraps it, because this one cuts it off.
        expect(
          (row.cells[0] as string).length,
          `${key} · ${title} would ellipsise “${row.cells[0]}”`,
        ).toBeLessThan(40);
      }
    }
  });

  it('scopes the ellipsis to the pair, and lets the other shape wrap', () => {
    const css = src('world/panel/panel.css');
    // The collapse that caused it exists only behind the pair's class.
    for (const match of css.matchAll(/max-width: 0;/g)) {
      const rule = css.slice(css.lastIndexOf('}', match.index) + 1, match.index);
      expect(rule, 'a table collapses its first column outside the pair layout').toContain(
        '.panel-table-pairs',
      );
    }
    expect(css).toMatch(
      /\.panel-table-columns td,\s*\n\.panel-table-columns th \{[^}]*white-space: normal/,
    );
    expect(css).toMatch(
      /\.panel-table-columns td,\s*\n\.panel-table-columns th \{[^}]*overflow-wrap: anywhere/,
    );
    // And nothing in that shape hides or abbreviates a cell.
    const columnsRules = css
      .split('}')
      .filter((rule) => rule.includes('.panel-table-columns'))
      .join('}');
    expect(columnsRules).not.toContain('text-overflow');
    expect(columnsRules).not.toContain('overflow: hidden');
  });

  it('gives every table in the markup a shape, including the provenance', () => {
    const panel = src('world/panel/Panel.tsx');
    expect(panel).toContain('className={`panel-table ${tableShape(section)}`}');
    expect(panel).toContain('className="panel-table panel-table-columns"');
    // No table is left with the bare class, which now has no layout at all.
    expect(panel).not.toContain('className="panel-table"');
  });
});
