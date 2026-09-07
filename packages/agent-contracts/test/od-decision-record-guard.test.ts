import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import settings from '../../../.claude/settings.json' with { type: 'json' };

/**
 * The owner-decision record guard (`.claude/hooks/od-decision-record-guard.mjs`).
 *
 * `constitution/authority.json` classifies `docs/decisions/OD-*` as `ownerInstructedOnly`: it
 * carries no `Write`/`Edit` deny rule, because a deny rule would make filing an owner decision
 * impossible for any session, which is what OD-0006 was decided to fix. Until this hook, nothing
 * checked what a session wrote there at all.
 *
 * OD-0006 requires a record made on the owner's instruction to quote the owner's exact words
 * verbatim, and classifies that requirement as **design-level only** because no code performed it.
 * This guard performs the part of it a machine can: it refuses a write whose resulting file lacks
 * a blockquoted verbatim quotation or a date.
 *
 * What these tests therefore prove, and what they do not. They prove the guard refuses a record
 * with no quotation, refuses one with no date, allows one with both, and leaves every path outside
 * `docs/decisions/OD-*` alone. They do not prove — and nothing can prove — that a quotation the
 * guard accepts is the owner's. The guard has no independent copy of the owner's instruction to
 * compare against; a session that invents a quotation and a date passes it completely.
 *
 * They also do not prove the guard is unavoidable. It runs on the `Write` and `Edit` tools only.
 * A write performed through `Bash` (`cat > docs/decisions/OD-0099.md`) never reaches it. That is
 * a real hole, recorded in `docs/architecture/ENFORCEMENT_BOUNDARIES.md` rather than papered over.
 */
const hook = resolve(import.meta.dirname, '../../../.claude/hooks/od-decision-record-guard.mjs');
const repoRoot = resolve(import.meta.dirname, '../../..');

type Verdict = { code: number; stderr: string };

function run(payload: unknown): Verdict {
  try {
    execFileSync('node', [hook], {
      input: typeof payload === 'string' ? payload : JSON.stringify(payload),
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    return { code: 0, stderr: '' };
  } catch (error) {
    const e = error as { status?: number; stderr?: string };
    return { code: e.status ?? 1, stderr: e.stderr ?? '' };
  }
}

const write = (filePath: string, content: string, cwd = repoRoot) => ({
  cwd,
  hook_event_name: 'PreToolUse',
  tool_name: 'Write',
  tool_input: { file_path: filePath, content },
});

const QUOTE_AND_DATE = [
  '# OD-0099 — A decision',
  '',
  "The owner's words, quoted verbatim:",
  '',
  '> "Ok let\'s do it properly. Go."',
  '',
  'Decided at: 2026-09-07 (the owner console).',
  '',
].join('\n');

describe('owner-decision record guard: content requirements', () => {
  it('allows a record carrying both a blockquoted verbatim quotation and a date', () => {
    expect(run(write('docs/decisions/OD-0099-example.md', QUOTE_AND_DATE)).code).toBe(0);
  });

  it('refuses a record with a date but no verbatim quotation', () => {
    const noQuote = QUOTE_AND_DATE.replace(
      '> "Ok let\'s do it properly. Go."',
      'The owner agreed.',
    );
    const verdict = run(write('docs/decisions/OD-0099-example.md', noQuote));
    expect(verdict.code).toBe(2);
    expect(verdict.stderr).toContain('verbatim quotation');
  });

  it('refuses a record with a quotation but no date', () => {
    const noDate = QUOTE_AND_DATE.replace('2026-09-07', 'today');
    const verdict = run(write('docs/decisions/OD-0099-example.md', noDate));
    expect(verdict.code).toBe(2);
    expect(verdict.stderr).toContain('YYYY-MM-DD');
  });

  it('refuses a record with neither, and names both requirements', () => {
    const verdict = run(write('docs/decisions/OD-0099-example.md', '# OD-0099\n\nNothing here.\n'));
    expect(verdict.code).toBe(2);
    expect(verdict.stderr).toContain('verbatim quotation');
    expect(verdict.stderr).toContain('YYYY-MM-DD');
  });

  it('does not accept prose quotation marks outside a blockquote as a verbatim quotation', () => {
    const inline = 'The owner said "let us do it properly and go" on 2026-09-07.\n';
    expect(run(write('docs/decisions/OD-0099-example.md', inline)).code).toBe(2);
  });

  it('accepts the typographic quotation marks a console may produce', () => {
    const curly = '> “Ok let us do it properly. Go.”\n\nDecided at: 2026-09-07.\n';
    expect(run(write('docs/decisions/OD-0099-example.md', curly)).code).toBe(0);
  });
});

describe('owner-decision record guard: scope', () => {
  it('leaves every path outside docs/decisions/OD-* alone', () => {
    for (const path of [
      'docs/decisions/README.md',
      'docs/decisions/ADR-0001-monorepo-tooling.md',
      'docs/architecture/ENFORCEMENT_BOUNDARIES.md',
      'packages/domain/src/reducer.ts',
      '.claude/settings.json',
    ])
      expect(run(write(path, 'no quotation, no date')).code, path).toBe(0);
  });

  it('guards the path whether it arrives relative or absolute', () => {
    const relative = run(write('docs/decisions/OD-0099-example.md', 'bare'));
    const absolute = run(write(join(repoRoot, 'docs/decisions/OD-0099-example.md'), 'bare'));
    expect(relative.code).toBe(2);
    expect(absolute.code).toBe(2);
  });

  it('an Edit that would remove the quotation is refused, one that keeps it is allowed', () => {
    const cwd = mkdtempSync(join(tmpdir(), 'od-guard-'));
    mkdirSync(join(cwd, 'docs/decisions'), { recursive: true });
    const file = 'docs/decisions/OD-0099-example.md';
    writeFileSync(join(cwd, file), QUOTE_AND_DATE, 'utf8');
    const edit = (oldString: string, newString: string) =>
      run({
        cwd,
        hook_event_name: 'PreToolUse',
        tool_name: 'Edit',
        tool_input: { file_path: file, old_string: oldString, new_string: newString },
      });
    expect(edit('> "Ok let\'s do it properly. Go."', 'The owner agreed.').code).toBe(2);
    expect(edit('# OD-0099 — A decision', '# OD-0099 — A decision, retitled').code).toBe(0);
  });
});

describe('owner-decision record guard: fails closed', () => {
  it('refuses a payload it cannot parse', () => {
    const verdict = run('not json at all');
    expect(verdict.code).toBe(2);
    expect(verdict.stderr).toContain('fails closed');
  });

  it('refuses a guarded write whose resulting content it cannot compute', () => {
    for (const payload of [
      {
        cwd: repoRoot,
        tool_name: 'MultiEdit',
        tool_input: { file_path: 'docs/decisions/OD-0099-x.md' },
      },
      {
        cwd: repoRoot,
        tool_name: 'Write',
        tool_input: { file_path: 'docs/decisions/OD-0099-x.md' },
      },
      {
        cwd: repoRoot,
        tool_name: 'Edit',
        tool_input: {
          file_path: 'docs/decisions/OD-0099-absent.md',
          old_string: 'a',
          new_string: 'b',
        },
      },
    ])
      expect(run(payload).code, JSON.stringify(payload.tool_name)).toBe(2);
  });
});

describe('the guard is wired into the session settings', () => {
  it('runs as a PreToolUse command hook matching Write and Edit', () => {
    const preToolUse = settings.hooks?.PreToolUse ?? [];
    const entry = preToolUse.find((h) => h.matcher === 'Write|Edit');
    expect(entry, 'a PreToolUse entry matching "Write|Edit"').toBeDefined();
    const commands = (entry?.hooks ?? []).map((h) => h.command);
    expect(commands.some((c) => c.includes('od-decision-record-guard.mjs'))).toBe(true);
    for (const h of entry?.hooks ?? []) expect(h.type).toBe('command');
  });

  it('docs/decisions/OD-* still carries no Write or Edit deny rule, as the constitution classifies it', () => {
    for (const rule of settings.permissions.deny)
      expect(rule.includes('docs/decisions'), rule).toBe(false);
  });
});
