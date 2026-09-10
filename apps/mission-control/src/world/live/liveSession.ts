import type { SendOutcome, SessionTransport } from '../window/session.js';

/**
 * **The transport that can actually start work.**
 *
 * Phase 2 slice three (`docs/process/PHASE_2_SLICE_3_BRIEF.md`). `session.ts`
 * left a seam and implemented it once, as a refusal: *"A later phase implements
 * this against a live session; this phase implements it once, as a refusal."*
 * This is that later phase, and it exists only in the hosted build —
 * `__LIVE__` is false everywhere else, so the Owner Build cannot reach it and
 * keeps making zero network requests.
 *
 * **Why the secret is asked for rather than shipped.**
 *
 * The endpoint has to know the request is his. Anything built into the page is
 * readable by anyone who opens the page, so a secret in the bundle is not a
 * secret. Instead he types it once, on his own device, and it is kept in that
 * browser's local storage and nowhere else: not in the repository, not in the
 * build, not in any answer this app returns. Clearing his browser data means
 * typing it again, which is the correct cost.
 *
 * **What this may never do**, and the reasons are the same ones the endpoint and
 * the workflow give:
 *
 *  - It sends an instruction. It does not merge, deploy, approve or delete, and
 *    the token behind the endpoint could not do those things if it tried.
 *  - It reports what happened, including refusal, in the endpoint's own words.
 *    A composer that said *sent* when the answer was 409 would be the same
 *    class of lie as a screen showing a verdict nobody returned.
 *  - It claims nothing about the work itself. Whether the run does what he asked
 *    is answered by the room, from GitHub and from the session's own report, not
 *    by this file congratulating itself.
 */

declare const __LIVE__: boolean;

/** Where the owner's shared secret is kept: his browser, and nowhere else. */
const SECRET_KEY = 'virgil.instruct.secret';

export function storedSecret(): string | null {
  // Each of the three tests `__LIVE__` first, for the reason given at `instruct`
  // below: a build that cannot send has no secret to keep, and the constant
  // folds these bodies — and the storage key with them — out of it entirely.
  if (!__LIVE__) return null;
  if (typeof localStorage === 'undefined') return null;
  try {
    const value = localStorage.getItem(SECRET_KEY);
    return value && value.length > 0 ? value : null;
  } catch {
    // Private browsing, or storage refused. Not an error worth a message: the
    // composer will ask for the secret again, which is the same thing it does
    // the first time.
    return null;
  }
}

export function rememberSecret(secret: string): void {
  if (!__LIVE__) return;
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(SECRET_KEY, secret.trim());
  } catch {
    // Nothing to do and nothing to say. The instruction can still be sent this
    // once; it is only the remembering that failed.
  }
}

export function forgetSecret(): void {
  if (!__LIVE__) return;
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.removeItem(SECRET_KEY);
  } catch {
    // As above.
  }
}

/** Whether this build can send at all, and whether it has what it needs to. */
export function canInstruct(): boolean {
  return __LIVE__ && storedSecret() !== null;
}

/**
 * Sends one instruction and reports exactly what the endpoint said.
 *
 * Never throws for a refusal: a refusal is an answer, and the composer prints
 * it. It throws only when there was no answer at all, which is a different
 * thing and is reported differently.
 */
export async function instruct(text: string, secret: string): Promise<SendOutcome> {
  /**
   * **The Keeper's KP2-10: this function did not read `__LIVE__`, so its body
   * survived into a build that can never call it.**
   *
   * `canInstruct()` read the flag and this did not, and the one call site sits
   * behind a runtime check the bundler cannot prove unreachable. So the V11
   * Owner Build — the single file the owner opens from `file://`, whose whole
   * promise is that it has no way to reach the network — carried `/api/instruct`,
   * `x-virgil-secret` and `virgil.instruct.secret` in its text. Not a request:
   * `verify:owner:v11` proves the artifact makes none, and it did. What it
   * carried was the machinery to make one, unreachable by an accident of control
   * flow rather than by construction.
   *
   * `__LIVE__` is a compile-time constant. Testing it *first*, before anything
   * else in the function, lets the bundler fold the branch away and take the
   * whole body with it — the strings included. `owner-build-v11.test.ts` greps
   * the artifact for them, so this cannot quietly come back.
   */
  if (!__LIVE__) {
    return {
      sent: false,
      kept: true,
      note: 'This build has nothing to send to. Nothing left this device.',
    };
  }
  const instruction = text.trim();
  if (!instruction) {
    return { sent: false, kept: false, note: 'Nothing was typed, so nothing was sent.' };
  }
  try {
    const response = await fetch('/api/instruct', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-virgil-secret': secret },
      body: JSON.stringify({ instruction }),
    });
    const answer = (await response.json().catch(() => null)) as {
      ok?: boolean;
      reason?: string;
      runsInTheLastDay?: number;
      ceiling?: number;
    } | null;

    if (response.ok && answer?.ok) {
      return {
        sent: true,
        kept: true,
        note:
          answer.runsInTheLastDay && answer.ceiling
            ? `Sent. A session is starting. That is ${answer.runsInTheLastDay} of ${answer.ceiling} runs today.`
            : 'Sent. A session is starting.',
      };
    }

    if (response.status === 401) {
      return {
        sent: false,
        kept: true,
        note: 'That secret was refused. Nothing was started. Your message is still on this page.',
      };
    }

    return {
      sent: false,
      kept: true,
      // The endpoint's own words. It knows why it refused and this does not
      // improve on it.
      note: `${answer?.reason ?? `The site answered ${response.status}.`} Your message is still on this page.`,
    };
  } catch (error) {
    return {
      sent: false,
      kept: true,
      note: `Nothing was sent: ${error instanceof Error ? error.message : String(error)}. Your message is still on this page.`,
    };
  }
}

/**
 * **What the composer says when it can actually send.**
 *
 * The Keeper's KP2-03: the page showed `NO_SESSION_NOTE` — *"It is not sent
 * because no agents are actually running"* — beneath a button labelled **Send**
 * that starts a real session. This is what stands there instead, and it makes
 * the same distinction the rest of the app makes: what happens is stated, what
 * is only claimed is not.
 */
export const LIVE_COMPOSER_NOTE =
  'This starts a real session on the working branch. It writes code and commits; it cannot merge, deploy, or touch the default branch.';

/**
 * The seam's live implementation.
 *
 * **It was written and never wired**, which is how the page came to say *"No
 * agents are running"* next to a button that starts agents. `AgentWindow` calls
 * it now.
 *
 * `connected` is true only when this build can send **and** the owner has given
 * it the secret, because a composer that says it is connected and then refuses
 * every message is worse than one that says it is not. Where it cannot, the
 * refusal is returned unchanged: the Owner Build says exactly what it has always
 * said, and `verify:owner:v11`'s requirement that the file build claims nothing
 * was sent still holds.
 */
export function liveTransport(base: SessionTransport): SessionTransport {
  if (!canInstruct()) return base;
  return {
    ...base,
    connected: true,
    absence:
      'A session can be started from here. It works on the working branch and cannot merge or deploy.',
  };
}
