#!/usr/bin/env node
/**
 * PreToolUse guard for `docs/decisions/OD-*` — the owner-decision records.
 *
 * Why this exists. OD-0006 records the owner's decision that their own turn in the owner console
 * is sufficient authority for a session to file an owner decision, and places two conditions on
 * it: the authority comes only from that channel, and the owner's exact words must appear
 * verbatim in the record. `constitution/authority.json` classifies `docs/decisions/OD-*` as
 * `ownerInstructedOnly` for that reason: it deliberately carries no `Write`/`Edit` deny rule,
 * because a deny rule would make filing impossible. Until this hook, nothing whatsoever checked
 * what a session wrote there. This closes the part of that gap a machine can close.
 *
 * What it enforces. A write to `docs/decisions/OD-*` is refused unless the resulting file
 * contains BOTH:
 *   1. a verbatim quotation — at least one Markdown blockquote line (`>`) carrying a
 *      double-quoted span of at least 8 characters, which is the form every filed decision in
 *      this repository already uses; and
 *   2. a date in `YYYY-MM-DD` form.
 * A record with neither, or with only one, cannot be written at all.
 *
 * What it does NOT enforce, and cannot. It does not check that the owner said the quoted words,
 * that the owner said anything, or that the instruction arrived through the owner console. It
 * cannot: nothing in this repository holds an independent copy of the owner's instruction to
 * compare against, and this hook has no such copy either. A session that invents a quotation and
 * a date satisfies it completely. Its whole effect is that a record filed WITHOUT the owner's
 * words can no longer be written silently; the authenticity of a quotation that is present
 * remains detectable only by the owner reading their own records. No other claim is made for it.
 *
 * Contract. Reads the PreToolUse payload as JSON on stdin. Exit 0 allows the tool call; exit 2
 * blocks it and the message on stderr is shown to the session. It fails closed: a payload it
 * cannot parse, or a tool whose resulting file content it cannot compute, is refused rather than
 * waved through, because a control that silently disables itself is worse than one that is
 * visibly in the way.
 */

import { readFileSync } from 'node:fs';
import { isAbsolute, relative, resolve, sep } from 'node:path';

/** The boundary this guard covers. Mirrors `boundaryProtection.ownerInstructedOnly`. */
export const GUARDED_PREFIX = 'docs/decisions/OD-';

/** A Markdown blockquote line carrying a double-quoted span of at least 8 characters. */
const QUOTATION = /^[ \t]{0,3}>[^\n]*["“][^"”\n]{8,}["”]/m;

/** An ISO calendar date. */
const DATE = /\b\d{4}-\d{2}-\d{2}\b/;

/** Whether a repository-relative POSIX path is an owner-decision record. */
export function isGuardedPath(repoRelativePath) {
  return typeof repoRelativePath === 'string' && repoRelativePath.startsWith(GUARDED_PREFIX);
}

/**
 * The two content requirements. Returns the list of requirements the text fails, empty when it
 * satisfies both. Pure: no file system, no clock, no network.
 */
export function missingRequirements(text) {
  if (typeof text !== 'string')
    return ['a readable file content', 'a verbatim quotation', 'a date'];
  const missing = [];
  if (!QUOTATION.test(text))
    missing.push(
      "a verbatim quotation of the owner's instruction, as a Markdown blockquote line " +
        'containing a double-quoted span of at least 8 characters, for example: > "..."',
    );
  if (!DATE.test(text)) missing.push('a date in YYYY-MM-DD form');
  return missing;
}

/** Repository-relative POSIX path for a tool `file_path`, or null when it escapes the repository. */
export function toRepoRelative(filePath, cwd) {
  if (typeof filePath !== 'string' || filePath.length === 0) return null;
  const absolute = isAbsolute(filePath) ? filePath : resolve(cwd, filePath);
  const rel = relative(cwd, absolute);
  if (rel === '' || rel.startsWith('..') || isAbsolute(rel)) return null;
  return rel.split(sep).join('/');
}

/** The file content a Write or Edit would leave behind, or an error explaining why it is unknown. */
export function resultingContent(toolName, toolInput, readFile) {
  if (toolName === 'Write') {
    const content = toolInput?.content;
    if (typeof content !== 'string')
      return { ok: false, reason: 'the Write call carries no content' };
    return { ok: true, content };
  }
  if (toolName === 'Edit') {
    const {
      old_string: oldString,
      new_string: newString,
      replace_all: replaceAll,
    } = toolInput ?? {};
    if (typeof oldString !== 'string' || typeof newString !== 'string')
      return { ok: false, reason: 'the Edit call carries no old_string/new_string pair' };
    let current;
    try {
      current = readFile();
    } catch {
      return {
        ok: false,
        reason: 'the file being edited could not be read, so the result is unknown',
      };
    }
    if (!current.includes(oldString))
      return {
        ok: false,
        reason: 'old_string does not appear in the file, so the result is unknown',
      };
    const content = replaceAll
      ? current.split(oldString).join(newString)
      : current.replace(oldString, newString);
    return { ok: true, content };
  }
  return {
    ok: false,
    reason: `the resulting file content cannot be computed for tool "${toolName}"`,
  };
}

/**
 * The whole decision, as a pure function. Returns `{ allow: true }` or
 * `{ allow: false, reason }`. `readFile` supplies the current content for an Edit.
 */
export function decide(payload, readFile) {
  if (payload === null || typeof payload !== 'object')
    return { allow: false, reason: 'the PreToolUse payload could not be read as JSON object' };
  const cwd =
    typeof payload.cwd === 'string' && payload.cwd.length > 0 ? payload.cwd : process.cwd();
  const toolName = payload.tool_name;
  const toolInput = payload.tool_input ?? {};
  const rel = toRepoRelative(toolInput.file_path, cwd);
  if (rel === null || !isGuardedPath(rel)) return { allow: true };

  const result = resultingContent(toolName, toolInput, () => readFile(toolInput.file_path, cwd));
  if (!result.ok)
    return {
      allow: false,
      reason:
        `Refused: ${rel} is an owner-decision record, and ${result.reason}. This guard must be ` +
        'able to see the whole resulting file to check it. Use Write with the complete record.',
    };

  const missing = missingRequirements(result.content);
  if (missing.length === 0) return { allow: true };
  return {
    allow: false,
    reason:
      `Refused: ${rel} is an owner-decision record and the result would be missing ` +
      `${missing.join(' and ')}.\n\n` +
      "OD-0006 requires that a decision recorded on the owner's instruction quote the owner's " +
      'exact words verbatim and carry the date it was given. This guard checks that a quotation ' +
      'and a date are present. It cannot and does not check that the owner said them; only the ' +
      'owner reading their own records can do that.',
  };
}

const isEntryPoint =
  process.argv[1] !== undefined && import.meta.url === `file://${resolve(process.argv[1])}`;

if (isEntryPoint) {
  let raw = '';
  process.stdin.setEncoding('utf8');
  for await (const chunk of process.stdin) raw += chunk;
  let payload = null;
  try {
    payload = JSON.parse(raw);
  } catch {
    process.stderr.write(
      'Refused: the owner-decision record guard could not parse the PreToolUse payload, so it ' +
        'cannot tell whether this write touches docs/decisions/OD-*. It fails closed.\n',
    );
    process.exit(2);
  }
  const verdict = decide(payload, (filePath, cwd) =>
    readFileSync(isAbsolute(filePath) ? filePath : resolve(cwd, filePath), 'utf8'),
  );
  if (verdict.allow) process.exit(0);
  process.stderr.write(`${verdict.reason}\n`);
  process.exit(2);
}
