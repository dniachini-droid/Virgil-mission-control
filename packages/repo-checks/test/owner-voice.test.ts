import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * **The rules that make the owner's window readable, held by something other
 * than the paragraph that states them.**
 *
 * `.claude/skills/raphael/SKILL.md` is the window the owner actually reads, and
 * on 2026-09-13 he said of a reply: *"I don't understand a single word of what
 * you just wrote."* The cause was measured rather than guessed. The skill
 * carried a word list of 27 technical terms and a rule requiring each to be
 * defined the first time it appeared — and **to define a term you have to use
 * it**, so the rule guaranteed every reply carried a pile of technical words
 * each dragging an explanation behind it.
 *
 * The repair inverts that: the plain wording is the only permitted wording and
 * the technical column becomes a do-not-say list. These guards exist because
 * every one of those changes is prose, and prose in this repository has a
 * measured record of not holding.
 *
 * **What these cannot do**, said rather than implied: no check can tell whether
 * a reply was understood. That is measured by the owner answering "so what do I
 * do?" without re-reading, and nothing here substitutes for it.
 */

const root = resolve(import.meta.dirname, '../../..');
const SKILL = '.claude/skills/raphael/SKILL.md';
const skill = readFileSync(resolve(root, SKILL), 'utf8');
const flat = skill.replace(/\s+/g, ' ');

describe('the owner window does not manufacture its own jargon', () => {
  it('no longer requires a term to be defined, which required it to be used', () => {
    // The exact rule that was removed. If it comes back, so does the problem.
    expect(flat, 'the define-every-term rule is back').not.toMatch(
      /Define a term the first time it appears/i,
    );
  });

  it('tells the session not to use the term at all', () => {
    expect(flat).toContain('Do not translate the term. Do not use the term.');
    expect(flat).toContain('One word per concept');
  });

  it('caps the teaching at one paragraph per reply', () => {
    // "Length is not the enemy" with nothing opposing it means "always longer".
    expect(flat).toMatch(/One teaching paragraph per reply, not one per item/);
    expect(flat, 'the length rule lost its counterweight').toContain(
      'Short by default. Longer only where the owner would otherwise be guessing',
    );
  });
});

describe('the word list is a do-not-say list, not a dictionary', () => {
  const rows = skill
    .split('\n')
    .filter((l) => l.startsWith('| ') && l.includes(' | '))
    .filter((l) => !/^\|\s*-+/.test(l));

  it('exists, is headed "Say this, never that", and has real rows', () => {
    expect(skill).toContain('### Say this, never that');
    expect(skill).toContain('| Say this | Never say |');
  });

  it('has two columns, because the third was the one that taught the jargon', () => {
    const table = skill.slice(skill.indexOf('| Say this | Never say |'));
    const body = table.slice(0, table.indexOf('\n\n')).split('\n').slice(2);
    expect(body.length, 'the do-not-say list has lost its rows').toBeGreaterThanOrEqual(20);
    for (const row of body) {
      const cells = row.split('|').filter((c) => c.trim() !== '');
      expect(cells.length, `a row has ${cells.length} columns, not 2: ${row}`).toBe(2);
    }
  });

  it('forbids the words a reply used to be built from', () => {
    for (const term of ['SHA', 'pull request', 'merge', 'stale', 'blocking', 'lineage']) {
      expect(
        rows.some((r) => r.split('|')[2]?.includes(term)),
        `${term} is no longer on the do-not-say list`,
      ).toBe(true);
    }
  });
});

describe('a report on finished work ends on meaning', () => {
  const questions = [
    'What is different?',
    'What do I do differently?',
    'What could go wrong',
    'What is still not right?',
  ];

  it('asks all four, in order', () => {
    let at = -1;
    for (const q of questions) {
      const next = skill.indexOf(q, at + 1);
      expect(next, `"${q}" is missing or out of order`).toBeGreaterThan(at);
      at = next;
    }
  });

  it('forbids identifiers in them, which is what makes them plain', () => {
    expect(flat).toContain('No identifiers.');
    expect(flat).toMatch(/no names, no numbers and no file paths/);
  });

  it('points "what is still not right" at the register, and names whose hop it is', () => {
    // Four findings were raised on 2026-09-13 and filed by nobody, because
    // recording one is a repair and the reviewer who raised them may not.
    expect(flat).toContain('docs/process/FINDINGS.md');
    expect(flat).toMatch(/names what is owed and whose hop it is/);
  });
});

describe('the shape is a checklist, and the voice lives in one place', () => {
  it('says the floor is three things, not a form of eight headings', () => {
    expect(flat).toContain('The floor is four things');
    expect(flat).toMatch(/checklist for the writer, not a template/);
  });

  it('keeps every voice rule in one section', () => {
    // They were spread across three blocks 470 lines apart and the ones at the
    // end contradicted the ones at the start, so a session applied whichever it
    // had read last.
    expect(skill).toContain('## How Raphael writes');
    expect(skill, 'a second voice section has reappeared').not.toContain(
      '## Standing rules for every reply',
    );
  });

  it('keeps one comparison rather than five', () => {
    // The five lived in an "Analogy" column of the word list, so deleting the
    // column is what fixed it. The skill still *names* the four it dropped, so
    // a later session does not reintroduce one in good faith — naming them as
    // forbidden is the opposite of using them, and this guard must not confuse
    // the two.
    expect(flat).toContain('One comparison, and only one');
    expect(flat).toContain('Do not introduce a second one');
    expect(skill, 'the analogy column is back').not.toContain('| Analogy |');
  });
});

describe('the description is short, because it is loaded every time', () => {
  const line = skill.split('\n').find((l) => l.startsWith('description:')) ?? '';

  it('is one sentence-length line, not a paragraph', () => {
    expect(line.length, `the description is ${line.length} characters`).toBeLessThan(500);
  });

  it('still carries the words that make the skill switch on', () => {
    for (const trigger of ['owner', 'pull request', 'merge', 'plain English']) {
      expect(line, `the description lost "${trigger}" and may stop triggering`).toContain(trigger);
    }
  });
});

/**
 * **The guards above catch deletion. These catch contradiction, which is the
 * failure this repository actually has.**
 *
 * `KXR-53/PR28` and `KXR-55/PR28`. A reviewer took the skill file, changed
 * **nothing that existed**, appended a section restoring the define-every-term
 * rule, a three-column jargon table, a second comparison and a second set of
 * voice rules — and every guard in the repository passed. It then appended a
 * section telling the conductor to poll on a timer with `create_trigger` and to
 * merge without the owner, and every guard passed that too.
 *
 * The reason each one missed is the same: it pinned one spelling.
 * `not.toContain('| Analogy |')` is walked past by `| Picture |`;
 * `not.toContain('## Standing rules for every reply')` by
 * `## Standing rules for every turn`; `not.toContain('send_later')` by
 * `create_trigger`. A later session's failure mode here is **adding**, not
 * removing, so a guard that only notices removal holds the paragraph rather
 * than the rule — which is what that file claims to do.
 *
 * These forbid classes. They are still not proof: a class named is a class
 * somebody thought of, and the next contradiction will be one nobody did.
 */
describe('the window cannot be talked back into jargon by adding to it', () => {
  it('carries no second voice section, however it is spelled', () => {
    const headings = skill.split('\n').filter((l) => l.startsWith('## '));
    const voiceish = headings.filter((h) =>
      /standing rules|voice|how to write|writing rules|style|tone|every reply|every turn/i.test(h),
    );
    expect(voiceish, `more than one voice section: ${voiceish.join(', ')}`).toHaveLength(0);
    expect(headings.filter((h) => h === '## How Raphael writes')).toHaveLength(1);
  });

  it('carries no rule telling the session to define or explain a term', () => {
    // The class, not the sentence: any instruction to gloss jargon rebuilds the
    // dictionary this change exists to delete.
    const banned =
      /(defin\w+|explain\w*|gloss\w*|spell\w* out|expand\w*)[^.\n]{0,60}(term|jargon|technical name|acronym)|(term|jargon|technical name)[^.\n]{0,60}(is defined|be defined|first time it appears)/i;
    // Only bolded instructions count. A sentence *naming* the rule this change
    // deleted is the opposite of carrying it, and an earlier version of this
    // guard failed on the paragraph explaining the deletion.
    const isInstruction = (l: string) => /^\s*(?:[-*]\s+|\d+\.\s+)?\*\*/.test(l);
    const offending = skill
      .split('\n')
      .filter(isInstruction)
      .filter((l) => banned.test(l) && !/^\s*\*\*Never/.test(l));
    expect(offending, `an explain-the-term rule is back: ${offending.join(' / ')}`).toEqual([]);
  });

  it('carries exactly one term table, and it is the do-not-say list', () => {
    const headers = skill
      .split('\n')
      .filter((l) => /^\|.*\|.*\|/.test(l) && /---/.test(l) === false);
    const termTables = headers.filter((l) =>
      /\bterm\b|\bsay this\b|\bmeaning\b|\bin plain words\b/i.test(l),
    );
    expect(termTables, `a second term table: ${termTables.join(' / ')}`).toEqual([
      '| Say this | Never say |',
    ]);
  });

  it('carries no second comparison, whatever the column is called', () => {
    const compare = skill
      .split('\n')
      .filter((l) => l.startsWith('|'))
      .filter((l) => /\b(analogy|picture|metaphor|like a|think of it as)\b/i.test(l));
    expect(compare, `a comparison column is back: ${compare.join(' / ')}`).toEqual([]);
  });

  it('names no scheduling tool at all, not merely the one the owner refused', () => {
    // "I don't want Raphael on a timer." A timer has many spellings.
    for (const tool of [
      'send_later',
      'create_trigger',
      'CronCreate',
      'ScheduleWakeup',
      'setInterval',
      'setTimeout',
      'sleep ',
    ]) {
      expect(skill, `${tool} appears in the conductor skill`).not.toContain(tool);
    }
    expect(flat).toContain('does not poll and does not run on a timer');
  });

  it('names no merging tool at all', () => {
    // A skill file instructing the conductor to merge passed every check in
    // this repository until this case existed.
    for (const tool of [
      'merge_pull_request',
      'enable_pr_auto_merge',
      'gh pr merge',
      'git merge',
      'update_pull_request_branch',
    ]) {
      expect(skill, `${tool} appears in the conductor skill`).not.toContain(tool);
    }
  });

  it('its description stays near what it is, not near the cap', () => {
    // The cap was < 500 against a description of 352: it permitted 71% of the
    // bloat it was written to prevent.
    const line = skill.split('\n').find((l) => l.startsWith('description:')) ?? '';
    expect(line.length, `the description is ${line.length} characters`).toBeLessThan(420);
  });
});

/**
 * **The plan, and the one thing a check can hold about it.**
 *
 * The owner, 2026-09-13: *"I'm worried we are losing our way and not keeping
 * track of our project and where we are headed."* `ROADMAP.md` had been stale
 * for a day and eleven pull requests, and he found it before any mechanism did.
 *
 * No check can know what he intends next, so no check can say whether the plan
 * is *right*. What one can hold is that the plan states the commit it was last
 * true at, so a reader can measure its staleness instead of trusting it, and
 * that the window is still told to read it.
 */
describe('the plan says when it was last true, and the window is told to check', () => {
  const roadmap = readFileSync(resolve(root, 'docs/process/ROADMAP.md'), 'utf8');

  it('carries the commit it was last true at', () => {
    expect(
      roadmap,
      'ROADMAP.md no longer stamps the commit it was true at, so nobody can measure its staleness',
    ).toMatch(/true as of[^\n]*`[0-9a-f]{7,40}`/i);
  });

  it('the window reads it at startup and reports how far behind it is', () => {
    expect(flat).toContain('git rev-list --count');
    expect(flat).toContain('docs/process/ROADMAP.md');
  });

  it('the window brings the plan up to date by commissioning it, never by editing it', () => {
    expect(flat).toContain('Raphael does not edit it');
    expect(flat).toMatch(/starts a session whose only job is to bring the plan/);
  });

  it('says plainly that none of this is a mechanism', () => {
    // The failure to avoid is a label that reads like a guarantee.
    expect(flat).toMatch(/is a label, not a guard/);
  });
});

/**
 * **A number is a label for the conductor's convenience. The owner acts on the
 * name.**
 *
 * His instruction, 2026-09-13: *"When you name the pull request numbers. Please
 * just say what it is."* He had four pieces of work in flight, identified in
 * every reply only by number, and a number tells him nothing about which is
 * which a day later.
 */
describe('a pull request is named before it is numbered', () => {
  it('the rule is stated, in the one place the voice rules live', () => {
    expect(flat).toContain('Never give a pull request a number without a name');
    const voice = skill.slice(skill.indexOf('## How Raphael writes'));
    expect(
      voice.indexOf('number without a name'),
      'the rule has drifted out of the voice section',
    ).toBeGreaterThan(-1);
  });

  it('the reply checklist asks for the name too', () => {
    expect(flat).toMatch(/each open pull request, \*\*named and then numbered\*\*/);
  });
});
