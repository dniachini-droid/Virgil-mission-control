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
    expect(flat).toContain('The floor is three things');
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
