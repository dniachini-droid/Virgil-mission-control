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

  it('stops rather than pretending when no key is installed', () => {
    expect(WORKFLOW).toContain('if [ -z "$ANTHROPIC_API_KEY" ]; then');
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
