import { useCallback, useSyncExternalStore } from 'react';
import type { Block, Message } from './blocks.js';
import { NO_SESSION_NOTE, transport } from './session.js';

/**
 * **What the interface remembers between openings.**
 *
 * Three things, and each is here because the brief asks for it in those words:
 *
 *  - *"complete persistent conversation history"* — what the reader typed stays
 *    typed. §5a, decision 3: *"Text typed into it is kept. It never pretends to
 *    have sent anything."* So a draft survives the window closing, and a turn
 *    the reader adds to a thread stays in that thread for the life of the page.
 *  - *"scroll preservation within conversations"* — a window reopened is where
 *    it was left, per window, not reset to the top.
 *  - which evidence sections the reader had opened, for the same reason.
 *
 * It is a module store rather than React state above the canvas, for the reason
 * `panelStore.ts` gives: lifting this into the room's own state would re-render
 * every mesh in the scene when a draft changes by one character.
 *
 * **Nothing here is sent anywhere.** The store is memory in one page; there is
 * no storage API, no cookie and no request. `verify:owner:v11` fails the build
 * on any off-document request, and `session.ts` is the only seam a real
 * transport could ever attach to.
 */

interface WindowMemory {
  draft: string;
  scrollTop: number;
  open: Record<string, boolean>;
  /** Turns the reader added. Kept, never sent. */
  typed: Message[];
}

const memory = new Map<string, WindowMemory>();
const listeners = new Set<() => void>();
/**
 * A version counter, and it is load-bearing.
 *
 * **The first version of this store subscribed in a `useEffect`, and a defect
 * followed that is worth recording because it produced a picture that lied.**
 * The window study expands every section by clicking each disclosure as soon as
 * the document is in the DOM. Those clicks land *between* React's commit and
 * its passive effects, so `announce()` had no subscriber yet: the store was
 * updated, no re-render was scheduled, and every "expanded" frame came out
 * showing only the sections that open by default — while the measurements taken
 * from the same page were correct. The measurement was right and the frame was
 * wrong, which is the worse way round.
 *
 * `useSyncExternalStore` is the fix rather than a workaround: it compares the
 * snapshot again after it subscribes and re-renders if it moved, so a change
 * made in that window cannot be lost. `panelStore.ts` uses the same idiom for
 * the same class of reason.
 */
let version = 0;

function slot(key: string): WindowMemory {
  const found = memory.get(key);
  if (found) return found;
  const fresh: WindowMemory = { draft: '', scrollTop: 0, open: {}, typed: [] };
  memory.set(key, fresh);
  return fresh;
}

function announce(): void {
  version += 1;
  for (const listener of listeners) listener();
}

export function draftOf(key: string): string {
  return slot(key).draft;
}

export function setDraft(key: string, draft: string): void {
  slot(key).draft = draft;
  announce();
}

export function scrollOf(key: string): number {
  return slot(key).scrollTop;
}

export function setScroll(key: string, top: number): void {
  slot(key).scrollTop = top;
}

export function openSections(key: string): Record<string, boolean> {
  return slot(key).open;
}

export function toggleSection(key: string, id: string, open: boolean): void {
  slot(key).open[id] = open;
  announce();
}

export function typedTurns(key: string): Message[] {
  return slot(key).typed;
}

/**
 * Keeps what the reader wrote, as a turn in the thread, and returns the
 * transport's own honest note about it. **The note is the transport's**, not a
 * string written here, so there is one sentence about having no session and it
 * cannot drift from what `session.ts` says.
 */
export function keepTurn(key: string, text: string): string {
  const trimmed = text.trim();
  if (trimmed.length === 0) return '';
  const outcome = transport().send(trimmed);
  const entry = slot(key);
  const blocks: Block[] = [{ kind: 'para', text: trimmed }];
  entry.typed = [
    ...entry.typed,
    { id: `${key}:typed:${entry.typed.length}`, from: 'owner', at: 'kept', blocks },
  ];
  entry.draft = '';
  announce();
  return outcome.sent ? '' : outcome.note;
}

/** For tests: forget everything. */
export function resetWindowMemory(): void {
  memory.clear();
  announce();
}

/** The one sentence the composer prints under itself. */
export const COMPOSER_NOTE = NO_SESSION_NOTE;

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

const snapshot = () => version;

/** Subscribes a component to the store. */
export function useWindowMemory(key: string): {
  draft: string;
  typed: Message[];
  open: Record<string, boolean>;
} {
  useSyncExternalStore(subscribe, snapshot, snapshot);
  const entry = slot(key);
  return { draft: entry.draft, typed: entry.typed, open: entry.open };
}

/** A stable callback that keeps a draft for one window. */
export function useDraft(key: string): (value: string) => void {
  return useCallback((value: string) => setDraft(key, value), [key]);
}
