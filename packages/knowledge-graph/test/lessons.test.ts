import { mkdirSync, mkdtempSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  LESSON_BODY_BYTE_BUDGET,
  LESSON_ID,
  LESSON_SEVERITY,
  LESSON_TAGS,
  type LessonFindingClass,
  LOADER_BYTE_BUDGET,
  RAW_SOURCE_COMPILED_THRESHOLD,
  scanLessons,
} from '../src/index.js';

/**
 * **Each direction of the lesson link is broken on purpose here, and each must
 * fail by name.**
 *
 * `docs/process/KNOWLEDGE_LESSONS_BRIEF.md`, criteria 3 to 5. The brief asks for
 * exactly this and says why: the repository's most repeated finding is a fact
 * separated from the thing it governs — `KP3-05`, `KXR-08`, `KXR-10`, `KXR-12`.
 * A link checked in one direction rots in the other.
 *
 * **The scenarios are built rather than described.** Every case below is a small
 * real tree written to a temporary directory and scanned, so a case cannot pass
 * because the scanner was mocked into agreeing with it. The clean tree is
 * scanned first: without it, every case below could be reporting its finding
 * because the base tree is broken rather than because the mutation did anything.
 *
 * **Nothing here writes a lesson link literally.** `link()` assembles one,
 * because a literal double-bracketed lesson id in this file would be a real
 * dangling link in the real repository. That is not hypothetical: the first run
 * of this suite failed on exactly that, in the sentence explaining why it must
 * not happen. The check working on the file that tests it.
 */

/** A wiki link to a lesson, assembled so this file contains no literal one. */
const link = (id: string) => `[[${id}]]`;

const lessonPage = (opts: {
  id: string;
  governs?: string[];
  scope?: string;
  tags?: string[];
  status?: string;
  sources?: boolean;
  body?: string;
}) => `---
nodeId: ${opts.id}
kind: lesson
title: "A lesson"
epistemicClass: durable_compiled_knowledge
authorityClass: compiled
status: ${opts.status ?? 'current'}
scope: ${opts.scope ?? 'general'}
tags: [${(opts.tags ?? ['verification']).join(', ')}]
governs:${(opts.governs ?? []).length === 0 ? ' []' : `\n${(opts.governs as string[]).map((g) => `  - ${g}`).join('\n')}`}
compiledAt: 2026-09-13T00:00:00+00:00
compiledBy: test
${opts.sources === false ? 'sources: []' : 'sources:\n  - { kind: code_path, ref: src/thing.ts }'}
claims: []
---

${opts.body ?? 'The body.'}
`;

const capture = (opts: { id: string; state?: string; destination?: string; evidence?: boolean }) =>
  `---
captureId: ${opts.id}
title: Something observed
observedAt: 2026-09-13T00:00:00+00:00
observedBy: test
${opts.evidence === false ? 'evidence: []' : 'evidence:\n  - src/thing.ts'}
destination: ${opts.destination ?? 'lesson-one'}
state: ${opts.state ?? 'open'}
---

What was observed.
`;

/**
 * The tree every scenario starts from: one lesson governing **two** files, each
 * naming it back.
 *
 * Two rather than one so a scenario can break exactly one direction. With a
 * single governed file, cutting the back-link also leaves the lesson named by
 * nothing, and the case would report two findings and isolate neither.
 */
function base(): Record<string, string> {
  return {
    'knowledge/LOADER.md': 'Directions, not content.\n',
    'knowledge/index.md': `# Index\n\n- ${link('lesson-one')}\n`,
    'knowledge/log.md': `# Log\n\nlesson-one filed.\n`,
    'knowledge/wiki/lessons/lesson-one.md': lessonPage({
      id: 'lesson-one',
      governs: ['src/thing.ts', 'docs/note.md'],
    }),
    'src/thing.ts': `// Why this shape: ${link('lesson-one')}\nexport const thing = 1;\n`,
    'docs/note.md': `# A note\n\nSee ${link('lesson-one')}.\n`,
  };
}

function scan(files: Record<string, string>) {
  const tree = mkdtempSync(join(tmpdir(), 'virgil-lessons-'));
  for (const [rel, content] of Object.entries(files)) {
    const full = join(tree, rel);
    mkdirSync(dirname(full), { recursive: true });
    writeFileSync(full, content);
  }
  return scanLessons({ repoRoot: tree });
}

const classesOf = (result: ReturnType<typeof scan>): LessonFindingClass[] =>
  [...new Set(result.findings.map((f) => f.findingClass))].sort();

interface Scenario {
  /** What was done to the clean tree. */
  name: string;
  files: Record<string, string>;
  expect: LessonFindingClass[];
  /** A fragment the finding must explain, so it fires for this reason. */
  because: RegExp;
}

const withFiles = (changes: Record<string, string | null>): Record<string, string> => {
  const files = base();
  for (const [path, content] of Object.entries(changes)) {
    if (content === null) delete files[path];
    else files[path] = content;
  }
  return files;
};

const SCENARIOS: Scenario[] = [
  {
    name: 'a link in code that names no lesson page',
    files: withFiles({
      'src/thing.ts': `// ${link('lesson-nowhere')}\nexport const thing = 1;\n`,
      'knowledge/wiki/lessons/lesson-one.md': lessonPage({
        id: 'lesson-one',
        governs: ['docs/note.md'],
      }),
    }),
    expect: ['lesson_link_unresolved'],
    because: /there is no such lesson page/,
  },
  {
    name: 'the lesson a file depends on is deleted',
    files: withFiles({ 'knowledge/wiki/lessons/lesson-one.md': null }),
    expect: ['lesson_link_unresolved'],
    because: /src\/thing\.ts links to/,
  },
  {
    name: 'a lesson naming a file that never names it back',
    // `docs/note.md` still names it, so the lesson is not orphaned and this
    // case reports the back-link and nothing else.
    files: withFiles({ 'src/thing.ts': 'export const thing = 1;\n' }),
    expect: ['lesson_link_not_returned'],
    because: /never names/,
  },
  {
    name: 'a lesson naming a file that is not in the repository',
    files: withFiles({
      'knowledge/wiki/lessons/lesson-one.md': lessonPage({
        id: 'lesson-one',
        governs: ['src/thing.ts', 'docs/note.md', 'src/gone.ts'],
      }),
    }),
    expect: ['lesson_governs_path_missing'],
    because: /not a file in this repository/,
  },
  {
    name: 'a lesson nothing names, with only the index and the journal mentioning it',
    files: withFiles({
      'knowledge/wiki/lessons/lesson-one.md': lessonPage({ id: 'lesson-one', governs: [] }),
      'src/thing.ts': 'export const thing = 1;\n',
      'docs/note.md': '# A note\n',
    }),
    expect: ['lesson_unreferenced'],
    because: /name every page by construction/,
  },
  {
    // `KXR-39` of `docs/process/KEEPER_PR20_REVIEW.md` — the bare id is
    // contested and the run record says why. Before the repair these three
    // reported nothing at all: the scan read `lesson-[a-z0-9-]+`, so a capital
    // letter or an underscore made a dangling link invisible to it.
    name: 'links whose ids carry a capital letter or an underscore, pointing at nothing',
    files: withFiles({
      'docs/note.md': `# A note\n\nSee ${link('lesson-one')}, ${link('lesson-One-Two')}, ${link(
        'lesson-one_two',
      )} and ${link('lesson-NOPE')}.\n`,
    }),
    expect: ['lesson_link_unresolved'],
    because: /lesson-NOPE/,
  },
  {
    // The same finding, the other direction: the page validator took any id
    // beginning `lesson-`, so a page could carry an id that no link to it could
    // be written in.
    name: 'a lesson page whose own id is outside the shape every link resolves by',
    files: withFiles({
      'knowledge/wiki/lessons/lesson-one.md': lessonPage({
        id: 'lesson-One',
        governs: ['src/thing.ts', 'docs/note.md'],
      }),
    }),
    expect: ['lesson_frontmatter_incomplete', 'lesson_link_unresolved'],
    because: /a nodeId matching \^lesson-/,
  },
  {
    // `KXR-40` of `docs/process/KEEPER_PR20_REVIEW.md`, likewise contested.
    // Before the repair this reported nothing: a sibling lesson page
    // counted as a reference, so a pair governing nothing kept each other alive.
    name: 'two lessons that govern nothing and cite only each other',
    files: withFiles({
      'knowledge/wiki/lessons/lesson-one.md': lessonPage({
        id: 'lesson-one',
        governs: [],
        body: `The body. See ${link('lesson-two')}.`,
      }),
      'knowledge/wiki/lessons/lesson-two.md': lessonPage({
        id: 'lesson-two',
        governs: [],
        body: `The body. See ${link('lesson-one')}.`,
      }),
      'src/thing.ts': 'export const thing = 1;\n',
      'docs/note.md': '# A note\n',
    }),
    expect: ['lesson_unreferenced'],
    because: /Neither does another lesson page/,
  },
  {
    name: 'a lesson with no scope, which is the field promotion will need',
    files: withFiles({
      'knowledge/wiki/lessons/lesson-one.md': lessonPage({
        id: 'lesson-one',
        governs: ['src/thing.ts', 'docs/note.md'],
        scope: 'somewhere',
      }),
      // The page is unreadable as a lesson, so the file that links to it is
      // linking to nothing: both halves report, which is the truth.
    }),
    expect: ['lesson_frontmatter_incomplete', 'lesson_link_unresolved'],
    because: /scope, one of repository or general/,
  },
  {
    name: 'a lesson resting on no evidence at all',
    files: withFiles({
      'knowledge/wiki/lessons/lesson-one.md': lessonPage({
        id: 'lesson-one',
        governs: ['src/thing.ts', 'docs/note.md'],
        sources: false,
      }),
    }),
    expect: ['lesson_frontmatter_incomplete', 'lesson_link_unresolved'],
    because: /the evidence it rests on/,
  },
  {
    name: 'two pages claiming the same lesson id',
    files: withFiles({
      'knowledge/wiki/lessons/lesson-one-again.md': lessonPage({
        id: 'lesson-one',
        governs: ['src/thing.ts', 'docs/note.md'],
      }),
    }),
    expect: ['lesson_id_not_unique'],
    because: /2 pages claim the lesson id lesson-one/,
  },
  {
    name: 'a second spelling of an idea already in the taxonomy',
    files: withFiles({
      'knowledge/wiki/lessons/lesson-one.md': lessonPage({
        id: 'lesson-one',
        governs: ['src/thing.ts', 'docs/note.md'],
        tags: ['verifying'],
      }),
    }),
    expect: ['tag_outside_taxonomy'],
    because: /which is not one of the \d+ tags/,
  },
  {
    name: 'a lesson page that has grown into two ideas',
    files: withFiles({
      'knowledge/wiki/lessons/lesson-one.md': lessonPage({
        id: 'lesson-one',
        governs: ['src/thing.ts', 'docs/note.md'],
        body: 'x'.repeat(LESSON_BODY_BYTE_BUDGET + 1),
      }),
    }),
    expect: ['lesson_page_over_budget'],
    because: /holding more than one idea/,
  },
  {
    name: 'a superseded lesson left standing beside its replacement',
    files: withFiles({
      'knowledge/wiki/lessons/lesson-one.md': lessonPage({
        id: 'lesson-one',
        governs: ['src/thing.ts', 'docs/note.md'],
        status: 'superseded',
      }),
    }),
    expect: ['superseded_lesson_not_folded'],
    because: /folded forward into the page that replaces it and deleted/,
  },
  {
    name: 'the loader grown past the budget it exists to keep',
    files: withFiles({
      'knowledge/LOADER.md': 'x'.repeat(LOADER_BYTE_BUDGET + 137),
    }),
    expect: ['loader_over_budget'],
    because: /2137 bytes against a budget of 2000: 137 over/,
  },
  {
    name: 'a capture that is evidence of nothing',
    files: withFiles({
      'knowledge/inbox/cap-one.capture.md': capture({ id: 'cap-one', evidence: false }),
    }),
    expect: ['capture_malformed'],
    because: /evidence: at least one path or command/,
  },
  {
    name: 'a capture claiming it became a page that does not exist',
    files: withFiles({
      'knowledge/inbox/cap-one.capture.md': capture({
        id: 'cap-one',
        state: 'ingested',
        destination: 'lesson-never-written',
      }),
    }),
    expect: ['capture_malformed'],
    because: /there is no such lesson page/,
  },
  {
    name: 'enough pages resting on a raw source that the source is compiled',
    files: (() => {
      const files = base();
      files['knowledge/raw/src-thing.source.md'] =
        '---\nsourceId: src-thing\nkind: specification\ntitle: A source\ncanonicalPath: src/thing.ts\ningestionState: sealed\nimmutable: true\n---\n';
      for (let n = 0; n < RAW_SOURCE_COMPILED_THRESHOLD; n += 1) {
        files[`knowledge/wiki/notes/page-${n}.md`] =
          `---\nnodeId: page-${n}\nkind: principle\ntitle: "P"\nsources:\n  - { kind: raw_source, ref: src-thing }\nclaims: []\n---\n\nBody.\n`;
      }
      return files;
    })(),
    expect: ['raw_source_ready_to_compile'],
    because: /wiki pages rest on src-thing/,
  },
];

const CLEAN = scan(base());
const RESULTS = SCENARIOS.map((scenario) => ({ scenario, result: scan(scenario.files) }));

describe('the tree these scenarios start from really is clean', () => {
  it('reports nothing at all before anything is broken', () => {
    expect(
      CLEAN.findings.map((f) => `${f.findingClass}: ${f.explanation}`),
      'the base tree is not clean, so every scenario below is measuring the base',
    ).toEqual([]);
  });

  it('sees the lesson, its governed file and the link between them', () => {
    expect(CLEAN.lessons.map((l) => l.nodeId)).toEqual(['lesson-one']);
    expect(CLEAN.lessons[0]?.governs).toEqual(['src/thing.ts', 'docs/note.md']);
    expect(CLEAN.lessons[0]?.scope).toBe('general');
  });
});

describe('each direction of the link, broken on purpose', () => {
  for (const { scenario, result } of RESULTS) {
    it(`${scenario.name} → ${scenario.expect.join(', ')}`, () => {
      expect(classesOf(result), JSON.stringify(result.findings.map((f) => f.explanation))).toEqual(
        [...scenario.expect].sort(),
      );
      // And fails for the reason the case is about, not an unrelated one: a
      // finding of the right class for the wrong cause proves nothing.
      expect(result.findings.map((f) => f.explanation).join(' | ')).toMatch(scenario.because);
      for (const finding of result.findings) {
        expect(finding.evidence.length, `${finding.findingClass} cites nothing`).toBeGreaterThan(0);
        expect(finding.repair.length, `${finding.findingClass} proposes nothing`).toBeGreaterThan(
          20,
        );
      }
    });
  }

  it('every finding class this scan can raise has been seen raising', () => {
    // The rule lesson-gates-that-cannot-refuse states, applied to this file. A
    // class nobody has watched fire is the same kind of thing as a gate that
    // cannot refuse, and this is how the eight of those accumulated.
    const seen = new Set(RESULTS.flatMap(({ result }) => classesOf(result)));
    const unseen = Object.keys(LESSON_SEVERITY).filter((c) => !seen.has(c as LessonFindingClass));
    expect(unseen, `never observed firing: ${unseen.join(', ')}`).toEqual([]);
  });

  it('names the byte count when the loader is over budget, rather than only saying so', () => {
    const over = RESULTS.find(({ scenario }) => scenario.expect.includes('loader_over_budget'));
    expect(over?.result.findings[0]?.explanation).toContain(
      `${LOADER_BYTE_BUDGET + 137} bytes against a budget of ${LOADER_BYTE_BUDGET}`,
    );
  });

  it('is a pure function of the tree: scanning twice says the same thing', () => {
    const files = base();
    const once = scan(files);
    const twice = scan(files);
    expect(JSON.stringify(twice.findings)).toBe(JSON.stringify(once.findings));
  });
});

/**
 * **The two halves of the identity, held to each other.**
 *
 * `KXR-39` of `KEEPER_PR20_REVIEW.md`: the scan and the page validator each
 * carried their own idea of what
 * a lesson id is, and drifted. `LESSON_ID_CHARS` in `lessons.ts` now makes the
 * containment hold by construction — but by construction is a claim a reader has
 * to check, and the disagreement it replaced also looked fine in isolation. So
 * it is asserted end to end instead: a whole tree built around each id, scanned,
 * and the verdict read off. An id the validator accepts and the scan cannot see
 * turns the first group red; an id the validator refuses and the scan cannot see
 * turns the second red.
 */
describe('the link scan and the page validator agree about what a lesson id is', () => {
  const treeFor = (id: string): Record<string, string> => ({
    'knowledge/LOADER.md': 'Directions, not content.\n',
    'knowledge/index.md': `# Index\n\n- ${link(id)}\n`,
    'knowledge/log.md': '# Log\n',
    [`knowledge/wiki/lessons/${id}.md`]: lessonPage({ id, governs: ['src/thing.ts'] }),
    'src/thing.ts': `// Why this shape: ${link(id)}\nexport const thing = 1;\n`,
  });

  for (const id of ['lesson-a', 'lesson-one-two-three', 'lesson-x9', 'lesson-9'])
    it(`accepts ${id} as a page id, and the scan finds the link that names it`, () => {
      expect(LESSON_ID.test(id)).toBe(true);
      const result = scan(treeFor(id));
      expect(result.findings.map((f) => f.explanation)).toEqual([]);
    });

  for (const id of ['lesson-One', 'lesson-one_two', 'lesson-NOPE'])
    it(`refuses ${id} as a page id, and the scan still sees a link written with it`, () => {
      expect(LESSON_ID.test(id)).toBe(false);
      const result = scan(treeFor(id));
      expect(classesOf(result)).toEqual([
        'lesson_frontmatter_incomplete',
        'lesson_link_unresolved',
      ]);
      expect(result.blocking).toBeGreaterThan(0);
    });
});

const repoRoot = resolve(import.meta.dirname, '../../..');

describe('the real repository', () => {
  const real = scanLessons({ repoRoot });

  it('has no blocking lesson findings', () => {
    expect(
      real.findings.filter((f) => f.severity === 'blocking'),
      JSON.stringify(real.findings, null, 1),
    ).toEqual([]);
  });

  it('has at least one lesson, or every check above guards an empty category', () => {
    expect(real.lessons.length).toBeGreaterThan(0);
    for (const lesson of real.lessons)
      expect(lesson.governs.length, `${lesson.nodeId} governs nothing`).toBeGreaterThan(0);
  });

  it('keeps the loader inside its budget, and says by how much', () => {
    const bytes = statSync(resolve(repoRoot, 'knowledge/LOADER.md')).size;
    expect(bytes, `the loader is ${bytes} bytes, budget ${LOADER_BYTE_BUDGET}`).toBeLessThanOrEqual(
      LOADER_BYTE_BUDGET,
    );
  });

  it('does not read another knowledge base nested inside this one', () => {
    // The fixture trees under packages/test-fixtures/knowledge are complete
    // knowledge bases and two of them hold pages whose ids begin "lesson-".
    // The first run of the whole-tree scan reported four blocking findings
    // against them. They belong to the fixture, not to this wiki.
    const subjects = real.findings.map((f) => f.subject);
    expect(subjects).not.toContain('lesson-a');
    expect(subjects).not.toContain('lesson-b');
  });
});

describe('the tag taxonomy is one list, in two places that agree', () => {
  const schema = readFileSync(resolve(repoRoot, 'knowledge/SCHEMA.md'), 'utf8');
  const line = schema.match(/^The tag taxonomy, closed: (.+)\.$/m)?.[1] ?? '';
  const documented = [...line.matchAll(/`([a-z-]+)`/g)].map((m) => m[1] as string);

  it('is stated in knowledge/SCHEMA.md at all', () => {
    expect(line, 'knowledge/SCHEMA.md does not state the closed tag taxonomy').not.toBe('');
  });

  it('documents every tag the check accepts', () => {
    for (const tag of LESSON_TAGS)
      expect(documented, `knowledge/SCHEMA.md does not document the tag "${tag}"`).toContain(tag);
  });

  it('accepts every tag it documents', () => {
    // The direction that matters more. A tag in the prose that the check
    // refuses sends the next writer to a finding, which is how a taxonomy
    // acquires its second spelling of one idea.
    for (const tag of documented)
      expect(
        LESSON_TAGS as readonly string[],
        `knowledge/SCHEMA.md documents a tag "${tag}" the check refuses`,
      ).toContain(tag);
  });
});
