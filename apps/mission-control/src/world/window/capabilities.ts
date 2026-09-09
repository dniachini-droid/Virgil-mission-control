import type { BlockKind } from './blocks.js';

/**
 * **The sixteen things the brief says this interface must be able to carry, and
 * the block or control that actually carries each one.**
 *
 * The brief: *"Architecture must be capable of carrying a real session later,
 * and support: complete persistent conversation history, streaming responses,
 * rich Markdown, code blocks, terminal output, plans and task progress, file
 * references and attachments, image and screenshot previews, commits and
 * branches, diffs, pull-request summaries, expandable tool activity,
 * verification evidence, owner decisions, approve/reject/pause/stop/resume
 * actions, and a full composer."*
 *
 * A claim of capability is worth nothing unless something falsifies it, so each
 * entry names what carries it, and `test/window-content-v11.test.ts` requires
 * every `carriedBy` block kind to appear in a real window document at some beat
 * of the demonstration, and every `carriedBy` control to exist in the component.
 * A capability that is only a sentence in a run record fails that test.
 *
 * **`live` is false for all sixteen and says why.** They are carried; none is
 * connected to a session (`session.ts`).
 */

export interface Capability {
  id: string;
  /** The brief's own words for it. */
  brief: string;
  /** The block kinds that render it, if it is content. */
  carriedBy: BlockKind[];
  /** The component or CSS class that renders it, if it is not a block. */
  control?: string;
  live: false;
}

export const CAPABILITIES: readonly Capability[] = [
  {
    id: 'history',
    brief: 'complete persistent conversation history',
    carriedBy: ['para'],
    control: 'v11w-thread',
    live: false,
  },
  {
    id: 'streaming',
    brief: 'streaming responses',
    carriedBy: [],
    control: 'v11w-streaming',
    live: false,
  },
  { id: 'markdown', brief: 'rich Markdown', carriedBy: ['markdown'], live: false },
  { id: 'code', brief: 'code blocks', carriedBy: ['code'], live: false },
  { id: 'terminal', brief: 'terminal output', carriedBy: ['terminal'], live: false },
  { id: 'plans', brief: 'plans and task progress', carriedBy: ['plan'], live: false },
  {
    id: 'files',
    brief: 'file references and attachments',
    carriedBy: ['files', 'attachment'],
    live: false,
  },
  {
    id: 'images',
    brief: 'image and screenshot previews',
    carriedBy: ['image'],
    live: false,
  },
  {
    id: 'commits',
    brief: 'commits and branches',
    carriedBy: ['commits', 'branch'],
    live: false,
  },
  { id: 'diffs', brief: 'diffs', carriedBy: ['diff'], live: false },
  { id: 'pr', brief: 'pull-request summaries', carriedBy: ['pr'], live: false },
  {
    id: 'tools',
    brief: 'expandable tool activity',
    carriedBy: ['tools'],
    control: 'v11w-section',
    live: false,
  },
  {
    id: 'evidence',
    brief: 'verification evidence',
    carriedBy: ['checks', 'evidence', 'facts', 'findings'],
    live: false,
  },
  { id: 'decisions', brief: 'owner decisions', carriedBy: ['decision'], live: false },
  {
    id: 'controls',
    brief: 'approve/reject/pause/stop/resume actions',
    carriedBy: [],
    control: 'v11w-control',
    live: false,
  },
  {
    id: 'composer',
    brief: 'a full composer',
    carriedBy: [],
    control: 'v11w-composer',
    live: false,
  },
];
