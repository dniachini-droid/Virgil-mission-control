import { RUN, RUN_SECONDS, recordedDuration } from '../../replay/recordedRun.js';
import type { RunMode, ScreenContent } from '../../room/demo.js';

/**
 * **The recorded run's own identity, added to the content V11's displays
 * read — and added *here*, in a V11-only module, for one reason.**
 *
 * Two of the Keeper's stage-4 findings are values a display invented because
 * nothing handed it the real one:
 *
 *  - **KS4-02** — the run slab printed the **playback** clock under the label
 *    `ELAPSED`, on a slab carrying `RECORDED RUN · REPLAYED` and a real
 *    candidate. `useReplay.ts` states the rule in its own header: *"`seconds`
 *    here is playback time and nothing else. It never appears as a duration of
 *    the recorded work."* The run it names took an hour and a half.
 *  - **KS4-04** — the Fabricator's console printed `BRANCH claude/…-v11` and
 *    `HEAD 9abcdef` as constants with no mode branch, so the replay showed a
 *    fabricated commit and the wrong branch.
 *
 * The obvious home for both is `replayTimeline.ts`'s `replayAt`, beside
 * `candidateId` and `evidence`, and that is where they were written first.
 * **They were moved out of it, and the reason is the preservation contract.**
 * V10's world imports the replay too, so two extra properties and one derived
 * constant in `replayAt` grew V10's clean-tree Owner Build from 8,528,318
 * bytes — the figure seven consecutive passes and two independent reviews have
 * measured — to 8,528,414. V11 is additive (`docs/process/V11_BRIEF.md`, *The
 * preservation contract*), and a V11 repair that moves V10's bytes is not
 * additive however small the number is. So the derivation lives in a module
 * only V11 imports, and V10's bundle is byte-for-byte what it was.
 *
 * Everything here is read from `recordedRun.ts`, which V10 already imports, so
 * nothing new reaches V10's graph either.
 */

/**
 * How long the recorded run took, from the run record's own `startedAt` and
 * `completedAt` — the same figure `VirgilRoom` prints as *"ran 1 H 30 M"*.
 */
export const RECORDED_ELAPSED = recordedDuration(RUN_SECONDS);

/**
 * `claude/virgil-main-consolidation-6f5fuc` as a console rail can set it: the
 * leading segment, an ellipsis, and the six characters that make it this
 * branch and no other. Derived from `RUN.branch`, never retyped, and the panel
 * prints it whole (`replay/replayContent.ts`).
 */
export const RECORDED_BRANCH = `${RUN.branch.split('/')[0]}/…-${RUN.branch.slice(-6)}`;

/**
 * The content V11's displays should read for this mode.
 *
 * In the scripted demonstration, unchanged: its `seconds` **is** the elapsed
 * time of the thing it demonstrates, and its identity is data-shaped on
 * purpose (`screens/candidate.ts`). In the replay, the run's real duration and
 * real branch, so that no surface has to invent either.
 */
export function contentFor(content: ScreenContent, mode: RunMode): ScreenContent {
  if (mode !== 'replay') return content;
  return { ...content, recordedElapsed: RECORDED_ELAPSED, branch: RECORDED_BRANCH };
}
