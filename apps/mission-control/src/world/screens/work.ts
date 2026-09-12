import type { Check, Finding } from './tally.js';

/**
 * **What a station is doing, as data rather than as a fixture.**
 *
 * From V8 to V9 the three station screens drew their work from `tally.ts`,
 * whose schedules are fixed illustrative numbers. That is right for the
 * scripted demonstration and wrong for the replay, where every count on a
 * screen has to be answerable with "where in the repository does this come
 * from". So the drawing takes the work as a parameter and `tally.ts`'s
 * fixtures become the demonstration's default rather than the only source.
 *
 * The drawing is unchanged and there is no second renderer: the same
 * `drawStation` draws both modes, from the same shapes. Only the numbers,
 * the check names and the finding severities differ, and in the replay
 * they are the ones `replay/recordedRun.ts` read out of the record.
 *
 * The times inside are **playback** seconds — when a bar starts filling on
 * screen — and are never reported as durations of the work. The recorded
 * durations live in `LedgerRow.recorded` and in the panel, and there is
 * exactly one of them.
 */
export type HopWork =
  | {
      kind: 'build';
      /** When each file lands, in playback seconds into the beat. */
      files: readonly number[];
      /** When each commit is made. */
      commits: readonly number[];
      /** The two lines the return draws under the report. */
      counts: readonly string[];
    }
  | {
      kind: 'checks';
      checks: readonly Check[];
      counts: readonly string[];
      /**
       * **What was actually read, when something was — SA-U-06.**
       *
       * `checks` is a *playback* shape: each entry carries a start time and a
       * duration, because the console animates a schedule. GitHub returns
       * neither, so live results could never be expressed as a schedule without
       * inventing the timings — which is why the live path left this empty and
       * the station screen drew `NOT READ`.
       *
       * The audit found the cost of that: the Prover's window said *"All 2
       * checks passed"* while his station screen, on the same page at the same
       * instant, said `NOT READ`. The owner walks to the Prover to find out
       * whether his checks passed and the station tells him nobody knows.
       *
       * So the counts travel separately from the schedule. The rail draws these;
       * the picture still draws nothing, because a schedule nobody read is still
       * a schedule nobody read. Real numbers, no invented motion.
       */
      read?: {
        passed: number;
        failed: number;
        running: number;
        skipped: number;
        /** Every check GitHub named, including any it had no word for. */
        total: number;
      };
    }
  | {
      kind: 'review';
      findings: readonly Finding[];
      /** How long the page takes to read, in playback seconds. */
      readSeconds: number;
      counts: readonly string[];
    };
