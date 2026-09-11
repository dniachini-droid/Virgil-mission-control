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
    }
  | {
      kind: 'review';
      findings: readonly Finding[];
      /** How long the page takes to read, in playback seconds. */
      readSeconds: number;
      counts: readonly string[];
    };
