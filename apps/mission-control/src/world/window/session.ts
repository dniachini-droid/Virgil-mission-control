import type { Message } from './blocks.js';

/**
 * **Where a real session would attach, and the honest statement that none is
 * attached.**
 *
 * The brief is explicit twice over: the architecture must be *"capable of
 * carrying a real session later"*, and *"there is no backend and you must not
 * fake one — where no real session exists, that truth is preserved clearly"*.
 * `docs/process/PHASE_1_CONVERSATION_INTERFACE.md` §6 states what a real one
 * would cost and refuses to authorise the controls: *"approve/reject/pause/
 * resume controls are Phase 3 capability wearing Phase 1 clothing. This
 * document does not authorise them."*
 *
 * So this file is the seam, and it has exactly one implementation: one that
 * refuses, and says why. Nothing in the interface calls a network, nothing
 * queues, nothing retries, and nothing appears to have acted:
 * `verify:owner:v11` fails the build on any off-document request, and the
 * unavailable controls are rendered `disabled` with `aria-disabled` and a
 * stated reason rather than as buttons that quietly do nothing.
 *
 * **Merge is the owner's alone in every phase** (`CLAUDE.md`'s hard limits,
 * and `authority.json`'s `ownerOnlyActions`), so no control here is a path to
 * one — not a disabled one, not a hidden one.
 */

/**
 * The session controls a real transport would carry. They are declared, typed
 * and listed so that the shape of the thing is settled; not one of them is
 * offered as usable today.
 */
export type SessionActionId = 'approve' | 'reject' | 'pause' | 'stop' | 'resume';

export interface SessionActionSpec {
  id: SessionActionId;
  label: string;
  /** What it would do, if there were a session. Stated in the interface. */
  would: string;
  /** Whether only the owner may ever perform it, whatever the phase. */
  ownerOnly: boolean;
}

export const SESSION_ACTIONS: readonly SessionActionSpec[] = [
  {
    id: 'approve',
    label: 'Approve',
    would:
      'Record that you accept the change. You will still need to add it to the project yourself.',
    ownerOnly: true,
  },
  {
    id: 'reject',
    label: 'Reject',
    would: 'Send the change back and explain what needs to change.',
    ownerOnly: true,
  },
  { id: 'pause', label: 'Pause', would: 'Pause every agent where it is.', ownerOnly: false },
  {
    id: 'stop',
    label: 'Stop',
    would: 'Stop the work and leave the change as it is.',
    ownerOnly: false,
  },
  {
    id: 'resume',
    label: 'Resume',
    would: 'Continue paused work from where it stopped.',
    ownerOnly: false,
  },
];

/** What happened to something the reader typed. Never `sent: true` in this build. */
export interface SendOutcome {
  sent: boolean;
  kept: boolean;
  note: string;
}

/** What happened when a control was reached for. Never `performed: true` here. */
export interface ActOutcome {
  performed: boolean;
  note: string;
}

/**
 * The seam itself. A later phase implements this against a live session; this
 * phase implements it once, as a refusal.
 */
export interface SessionTransport {
  readonly connected: boolean;
  /** Why not, in one sentence the interface is allowed to print verbatim. */
  readonly absence: string;
  /** The persisted history for one window. Empty here; the demonstration's own. */
  history(key: string): Message[];
  send(text: string): SendOutcome;
  act(action: SessionActionId): ActOutcome;
  /** A real transport streams; this one never calls the listener. */
  subscribe(listener: (message: Message) => void): () => void;
}

export const NO_SESSION_NOTE =
  'Your message stays on this page. It is not sent because no agents are actually running.';

export const NO_SESSION: SessionTransport = {
  connected: false,
  absence: 'Nothing is running behind this build. Nothing here can change the project.',
  history: () => [],
  send: (text: string) => ({
    sent: false,
    kept: text.length > 0,
    note: NO_SESSION_NOTE,
  }),
  act: (action: SessionActionId) => ({
    performed: false,
    note: `${action} is not available: nothing is running behind this build, and only you can put a change into the project.`,
  }),
  subscribe: () => () => undefined,
};

/** The transport the interface uses. One value, one place to change later. */
export function transport(): SessionTransport {
  return NO_SESSION;
}
