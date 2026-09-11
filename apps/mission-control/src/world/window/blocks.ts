import type { Role } from '../room/cast.js';

/**
 * **The blocks a window is made of, and the reason they are a union and not
 * prose.**
 *
 * V11 stage 3's architecture requirement, in the brief's own words:
 * *"Architecture must be capable of carrying a real session later"*, and it
 * lists what a real session puts on a page — history, streaming, Markdown,
 * code, terminal output, plans, file references, attachments, image previews,
 * commits and branches, diffs, pull-request summaries, tool activity,
 * verification evidence, owner decisions, controls and a composer.
 *
 * A window that rendered authored HTML per agent could not carry any of that
 * later without being rewritten. So the window renders **a list of blocks**,
 * one renderer per kind, and today's content is a set of blocks built from the
 * scripted demonstration's own state. A real transcript would build the same
 * blocks from a different source and the renderer would not change. That claim
 * is not left to prose: `capabilities.ts` names each of the sixteen and
 * `test/window-content-v11.test.ts` fails if any one of them is not actually
 * carried by a block in a real window document.
 *
 * **Nothing here holds a live operational value.** Every figure comes from the
 * demonstration's fixed schedules through `screens/tally.ts` and
 * `screens/v11/content.ts` — the same functions the in-world screens draw
 * from, so the screen stays a summary of the window and the two cannot drift
 * (`docs/process/PHASE_1_CONVERSATION_INTERFACE.md` §5b, and the V7 defect
 * that rule exists because of).
 */

/** Who a message is from. `system` is the build itself speaking about itself. */
export type Speaker = 'virgil' | Role | 'owner' | 'system';

/** What a check resolved to, in `constitution/authority.json`'s own words. */
export type CheckState = 'running' | 'passed' | 'failed' | 'skipped';

/**
 * **Verified or claimed, and never blurred.** The Prover's window has to draw
 * *"a clear distinction between verified facts and claims"*, and `CLAUDE.md`
 * makes the same distinction a hard limit: *"A builder's success report is not
 * evidence."* So standing is a property of a stated fact, not a tone of voice.
 */
export type Standing = 'verified' | 'claim' | 'unresolved';

export type Block =
  /** Ordinary conversation prose. Proportional type, never uppercase. */
  | { kind: 'para'; text: string }
  /**
   * A small, deliberately restricted Markdown subset: `**bold**`, `` `code` ``,
   * `- ` bullets and `> ` quotes. Restricted because a full parser is a
   * liability in a `file://` document with no sanitiser, and because these four
   * are what a session's own messages actually use.
   */
  | { kind: 'markdown'; markdown: string }
  | { kind: 'code'; language: string; path?: string; lines: string[] }
  | {
      kind: 'terminal';
      command: string;
      lines: { stream: 'out' | 'err'; text: string }[];
      exit?: number;
    }
  | { kind: 'plan'; steps: { text: string; state: 'done' | 'active' | 'todo' }[] }
  | { kind: 'files'; rows: { path: string; status: string; plus: number }[] }
  | { kind: 'commits'; rows: { sha: string; subject: string }[] }
  | { kind: 'branch'; branch: string; base: string; head: string; note: string }
  | {
      kind: 'diff';
      path: string;
      hunk: string;
      lines: { sign: ' ' | '+' | '-'; text: string }[];
    }
  | { kind: 'pr'; title: string; identity: string; state: string; lines: string[] }
  | { kind: 'checks'; rows: { name: string; state: CheckState }[] }
  | { kind: 'findings'; rows: { id: string; severity: string; where: string }[] }
  | { kind: 'evidence'; rows: { label: string; value: string; standing: Standing }[] }
  | { kind: 'facts'; rows: { text: string; standing: Standing }[] }
  | { kind: 'tools'; rows: { tool: string; detail: string; running: boolean }[] }
  | { kind: 'attachment'; name: string; note: string }
  | { kind: 'image'; label: string; note: string; tint: string }
  | { kind: 'decision'; question: string; options: string[]; note: string }
  | { kind: 'table'; head: string[]; rows: string[][] }
  /** A statement about this build's own truthfulness. Never styled as content. */
  | { kind: 'note'; text: string };

export type BlockKind = Block['kind'];

/** One turn in a window's conversation. */
export interface Message {
  /** Stable within a window, so React keys and scroll restoration are stable. */
  id: string;
  from: Speaker;
  /** A relative label — "at 00:14 of the demonstration" — never a wall clock. */
  at: string;
  /**
   * The last message of a window that is mid-work renders as still arriving:
   * the streaming path the architecture has to carry. It is **not** a fake
   * network stream; it is the demonstration's current beat, which genuinely is
   * unfinished at that moment.
   */
  streaming?: boolean;
  blocks: Block[];
}

/**
 * An expandable section: the *"detailed evidence on demand"* level of the
 * hierarchy. Collapsed by default unless the state makes it the point.
 */
export interface Section {
  id: string;
  title: string;
  /** One line readable while it is closed, so opening it is a choice. */
  summary: string;
  blocks: Block[];
  open?: boolean;
}

/** Every text a block puts on screen. Used by the content tests. */
export function blockText(block: Block): string[] {
  switch (block.kind) {
    case 'para':
      return [block.text];
    case 'markdown':
      return [block.markdown];
    case 'code':
      return [block.path ?? '', ...block.lines];
    case 'terminal':
      return [block.command, ...block.lines.map((l) => l.text)];
    case 'plan':
      return block.steps.map((s) => s.text);
    case 'files':
      return block.rows.flatMap((r) => [r.path, r.status, String(r.plus)]);
    case 'commits':
      return block.rows.flatMap((r) => [r.sha, r.subject]);
    case 'branch':
      return [block.branch, block.base, block.head, block.note];
    case 'diff':
      return [block.path, block.hunk, ...block.lines.map((l) => l.text)];
    case 'pr':
      return [block.title, block.identity, block.state, ...block.lines];
    case 'checks':
      return block.rows.flatMap((r) => [r.name, r.state]);
    case 'findings':
      return block.rows.flatMap((r) => [r.id, r.severity, r.where]);
    case 'evidence':
      return block.rows.flatMap((r) => [r.label, r.value]);
    case 'facts':
      return block.rows.map((r) => r.text);
    case 'tools':
      return block.rows.flatMap((r) => [r.tool, r.detail]);
    case 'attachment':
      return [block.name, block.note];
    case 'image':
      return [block.label, block.note];
    case 'decision':
      return [block.question, ...block.options, block.note];
    case 'table':
      return [...block.head, ...block.rows.flat()];
    case 'note':
      return [block.text];
    default:
      return [];
  }
}
