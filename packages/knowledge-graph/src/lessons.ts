/**
 * **Lessons: the way engineering knowledge gets into the wiki, and the check
 * that keeps it tied to the code it is about.**
 *
 * `docs/process/KNOWLEDGE_LESSONS_BRIEF.md`. Everything this repository had
 * learned lived in three places and none of them was a knowledge base: long
 * prose comments in source files, review documents on unmerged branches, and
 * forty-six files in `docs/process/`. The wiki existed the whole time. What was
 * missing was a way in during a build, and a reason the two halves would stay
 * together afterwards.
 *
 * So there are two new things and one check:
 *
 *  - **`knowledge/inbox/`** — a capture. A session that learns something writes
 *    one small file and keeps working. **A capture is not a wiki page and must
 *    not be read as one**; it is raw material waiting for a later pass.
 *  - **`knowledge/wiki/lessons/`** — where a capture ends up, as a page with a
 *    stable id, the files it governs, the evidence it rests on, whether it is
 *    specific to this repository or general, and its tags.
 *  - **the link, checked in both directions.** A comment shrinks to one sentence
 *    and `[[lesson-…]]`; the page names the files it governs. Either half alone
 *    rots, and this repository's most repeated finding is exactly that failure:
 *    `KP3-05` (two checkers, 106 disagreements), `KXR-08` (a pointer at a
 *    document that disclaimed being one), `KXR-10` (a pointer satisfied by the
 *    register itself), `KXR-12` (instructions wrong about their own guard).
 *    Every time a fact has been separated from the thing it governs here, the
 *    two came apart.
 *
 * **Why this is not part of `scanGraph`.** Mind Scan's finding vocabulary is
 * `MindScanFindingClass` in `@virgil/agent-contracts`, a closed enum exported to
 * `schemas/mind-scan-finding.schema.json`. The brief that authorises this work
 * does not permit changing either, and a session does not widen a contract it
 * was not given. So lesson findings carry their own class names, and
 * `tools/knowledge-lint` runs both scans and returns one exit code — the
 * separation is in the source, not in what anybody runs. Unifying the two
 * vocabularies is a governed change and is named in the run record as such.
 *
 * **This module reads. It never writes.** Given the same tree it returns the
 * same findings.
 */
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { basename, join, relative, resolve } from 'node:path';
import { readFrontmatter } from './derive.js';

/**
 * **The loader's byte budget, and the reason there is a number at all.**
 *
 * `knowledge/LOADER.md` says how to *find* knowledge and never holds any. That
 * is the whole answer to "sophisticated but does not bloat context" — and it is
 * also the kind of file that grows a paragraph at a time until it has quietly
 * become the thing it exists to avoid. A budget nobody measures is a wish.
 *
 * 2,000 bytes, decided by the owner on 2026-09-13 in answer to the brief's third
 * question: about three hundred words, roughly a sixth of what `CLAUDE.md`
 * already costs every session. The number can be raised later. What matters is
 * that raising it is deliberate and visible, which is what a check makes it.
 */
export const LOADER_BYTE_BUDGET = 2000;

/**
 * **A lesson page that has outgrown this is holding two ideas.** The brief's
 * rule is "split a page when it holds two distinct ideas", which no check can
 * read directly; a size is the honest proxy and it is a proxy, not the rule.
 * It is set where the longest of the source-file essays this work exists to
 * replace lands, so converting one never produces a page that is instantly over.
 */
export const LESSON_BODY_BYTE_BUDGET = 4000;

/**
 * **Once this many wiki pages rest on a raw source, the source is compiled.**
 * `karpathy-wiki`'s rule is to archive a raw source once five or more pages
 * reference it: go to the pages, not back to the source. This repository's
 * vocabulary for that already exists — `ingestionState: compiled` in
 * `knowledge/SCHEMA.md` — so the rule is expressed in it rather than in a new
 * word nobody else uses.
 */
export const RAW_SOURCE_COMPILED_THRESHOLD = 5;

/**
 * **One spelling per idea.** A free-text tag field grows three spellings of the
 * same thought and then the tags stop being a way to find anything. A new tag is
 * a deliberate addition here — one line in this list and one in
 * `knowledge/SCHEMA.md`, which a test holds to each other in both directions.
 */
export const LESSON_TAGS = [
  'verification',
  'governance',
  'record-keeping',
  'knowledge',
  'tooling',
  'interface',
  'performance',
  'security',
] as const;

export type LessonTag = (typeof LESSON_TAGS)[number];

/** Whether a lesson is a fact about this repository or about building anything. */
export const LESSON_SCOPES = ['repository', 'general'] as const;
export type LessonScope = (typeof LESSON_SCOPES)[number];

export type LessonFindingClass =
  /** A `[[lesson-…]]` somewhere in the tree names no lesson page. */
  | 'lesson_link_unresolved'
  /** A lesson names a file it governs; that file does not name it back. */
  | 'lesson_link_not_returned'
  /** A lesson names a file it governs that is not in the repository. */
  | 'lesson_governs_path_missing'
  /** A lesson page nothing outside the index and the journal names. */
  | 'lesson_unreferenced'
  /** A lesson missing the frontmatter every lesson carries. */
  | 'lesson_frontmatter_incomplete'
  /** Two pages claiming the same lesson id, so the id is not an identity. */
  | 'lesson_id_not_unique'
  /** A capture missing its frontmatter, or ingested into a page that is absent. */
  | 'capture_malformed'
  /** A lesson page past the size where it is holding two ideas. */
  | 'lesson_page_over_budget'
  /** The loader has grown into the context cost it exists to avoid. */
  | 'loader_over_budget'
  /** A tag outside the bounded taxonomy: a second spelling of one idea. */
  | 'tag_outside_taxonomy'
  /** A superseded lesson left standing beside its replacement. */
  | 'superseded_lesson_not_folded'
  /** Enough pages rest on a raw source that the source is compiled. */
  | 'raw_source_ready_to_compile';

export type LessonSeverity = 'blocking' | 'major' | 'minor';

/**
 * Exported so the tests can enumerate the classes and refuse to pass while one
 * of them has never been seen firing — the same rule
 * [[lesson-gates-that-cannot-refuse]] states, applied to this file.
 */
export const LESSON_SEVERITY: Record<LessonFindingClass, LessonSeverity> = {
  lesson_link_unresolved: 'blocking',
  lesson_link_not_returned: 'blocking',
  lesson_governs_path_missing: 'blocking',
  lesson_unreferenced: 'blocking',
  lesson_frontmatter_incomplete: 'blocking',
  lesson_id_not_unique: 'blocking',
  capture_malformed: 'blocking',
  loader_over_budget: 'blocking',
  lesson_page_over_budget: 'major',
  tag_outside_taxonomy: 'major',
  superseded_lesson_not_folded: 'major',
  raw_source_ready_to_compile: 'minor',
};

export interface LessonFinding {
  findingClass: LessonFindingClass;
  severity: LessonSeverity;
  /** The lesson id, capture id or repository path the finding is about. */
  subject: string;
  /** Where a reader looks. Repository-relative. */
  evidence: string[];
  explanation: string;
  repair: string;
}

export interface LessonPage {
  nodeId: string;
  path: string;
  title: string;
  scope: string;
  tags: string[];
  governs: string[];
  sourceCount: number;
  status: string;
  bodyBytes: number;
}

export interface Capture {
  captureId: string;
  path: string;
  destination: string;
  state: string;
}

export interface LessonScanResult {
  lessons: LessonPage[];
  captures: Capture[];
  findings: LessonFinding[];
  blocking: number;
  /** Size of `knowledge/LOADER.md`, or `null` when there is no loader. */
  loaderBytes: number | null;
}

export interface LessonScanOptions {
  repoRoot: string;
  knowledgeDir?: string;
}

/** Directories that are never repository content. */
const SKIP_DIRS = new Set([
  'node_modules',
  'dist',
  '.git',
  '.turbo',
  'coverage',
  '.pnpm-store',
  'test-results',
]);

/** Extensions worth reading for a wiki link. Everything else is bytes. */
const TEXT_EXTENSIONS = [
  '.ts',
  '.tsx',
  '.js',
  '.jsx',
  '.mjs',
  '.cjs',
  '.md',
  '.json',
  '.yml',
  '.yaml',
  '.css',
  '.html',
  '.sh',
  '.txt',
];

/**
 * **What a lesson id is. One constraint, in one place.**
 *
 * `lesson-` and then lowercase words. The prefix is load-bearing: it is what
 * lets one regular expression over the whole tree distinguish a link to a
 * lesson from the `[[nodeId]]` links the wiki has always used between its other
 * pages, without a list of ids to keep in step.
 *
 * **This was stated twice and the two statements disagreed.** The tree scan
 * matched `lesson-[a-z0-9-]+`; the page validator accepted any `nodeId` that
 * merely began `lesson-`. Both directions of the link were wrong
 * as a result. A link whose id carried a capital letter or an underscore was
 * invisible to the scan — three dangling links written into one file reported
 * nothing and exited 0 — and a page whose id carried one was accepted and then
 * reported broken from the very file that named it correctly. That is the exact
 * rot the mechanism exists to catch, one level down: two checkers inside one
 * module disagreeing about the identity everything else resolves by.
 *
 * So the charset is declared once, here, and everything below is built from it.
 *
 * **The finding is `KXR-39` of `docs/process/KEEPER_PR20_REVIEW.md`**, named
 * with its document rather than by its number alone: `KXR-39` already means
 * something else in this same tree, at `packages/gate-engine/test/tiers.test.ts`
 * line 13. That collision is not this session's to resolve and is set out in
 * `docs/process/KNOWLEDGE_LESSONS_RUN_RECORD.md`, "Repair round one".
 */
const LESSON_ID_CHARS = 'a-z0-9';

/**
 * **The characters a lesson link is *read* with, which is deliberately wider.**
 *
 * The id charset plus the two ways a hand-typed id goes wrong: a capital letter
 * and an underscore. Spliced from `LESSON_ID_CHARS` rather than written beside
 * it, so the scan cannot stop covering an id the validator accepts — the
 * containment holds by construction, and `test/lessons.test.ts` asserts it as
 * well, because by construction is a claim a reader has to check and a test is
 * one they do not.
 *
 * A typo has to be *visible* before it can be rejected, and it needs no finding
 * class of its own: an id outside `LESSON_ID` can never be a page's `nodeId`,
 * so a link written with one resolves to no page and fails as
 * `lesson_link_unresolved`, which is what it is.
 *
 * **It stops short of matching anything at all between the brackets, and that
 * boundary is deliberate.** `[[lesson-…]]`, with a literal ellipsis, is how the
 * prose here *discusses* a lesson link without making one — eight times, in the
 * brief, in `knowledge/SCHEMA.md`, in the run record and in this file. A scan
 * that read prose would turn all eight into blocking findings and teach the next
 * writer to stop explaining the mechanism. `BR-03` is that lesson already
 * learned once.
 */
const LESSON_LINK_EXTRA_CHARS = 'A-Z_';

/**
 * A well-formed lesson id. The page validator and the link scan both resolve by
 * this and there is nowhere else that decides it. The hyphen sits last in each
 * character class below so splicing the classes together stays valid.
 */
export const LESSON_ID = new RegExp(`^lesson-[${LESSON_ID_CHARS}-]+$`);

/** Anything written as a lesson link, well-formed or not. */
const LESSON_LINK = new RegExp(
  `\\[\\[(lesson-[${LESSON_ID_CHARS}${LESSON_LINK_EXTRA_CHARS}-]+)\\]\\]`,
  'g',
);

const str = (v: unknown, d = ''): string => (typeof v === 'string' ? v : d);
const strArr = (v: unknown): string[] =>
  Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [];

function walk(dir: string, out: string[] = []): string[] {
  if (!existsSync(dir)) return out;
  for (const entry of readdirSync(dir).sort()) {
    if (SKIP_DIRS.has(entry)) continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, out);
    else out.push(full);
  }
  return out;
}

/**
 * **Another knowledge base's tree is not this one's, and the first run proved it.**
 *
 * `packages/test-fixtures/knowledge/*` holds complete miniature knowledge trees
 * — the fixtures Mind Scan is tested against. Two of them contain pages whose
 * ids happen to begin `lesson-`, and the first run of the whole-tree link scan
 * reported four blocking findings against them: links inside a fixture,
 * resolved against the real wiki, which is not where they point.
 *
 * So the scan does not descend into a directory named `knowledge` that holds a
 * `wiki` and is not the root it was asked to scan. A fixture tree is scanned
 * when it *is* the root — which is how the tests below read it — and is
 * otherwise somebody else's knowledge base sitting inside this one.
 */
function isForeignKnowledgeRoot(dir: string, ownKnowledgeDir: string): boolean {
  return (
    basename(dir) === 'knowledge' &&
    resolve(dir) !== resolve(ownKnowledgeDir) &&
    existsSync(join(dir, 'wiki'))
  );
}

function walkTree(dir: string, ownKnowledgeDir: string, out: string[] = []): string[] {
  if (!existsSync(dir)) return out;
  for (const entry of readdirSync(dir).sort()) {
    if (SKIP_DIRS.has(entry)) continue;
    const full = join(dir, entry);
    if (!statSync(full).isDirectory()) {
      out.push(full);
      continue;
    }
    if (isForeignKnowledgeRoot(full, ownKnowledgeDir)) continue;
    walkTree(full, ownKnowledgeDir, out);
  }
  return out;
}

/**
 * **Files that cannot be evidence that a lesson is used.**
 *
 * `knowledge/index.md` lists every page and `knowledge/log.md` journals every
 * operation. If either counted as a reference, every lesson would be referenced
 * the moment it was filed and `lesson_unreferenced` could never fire — a guard
 * satisfied by its own bookkeeping, which is `KXR-10` in a new place.
 *
 * **And neither can another lesson page.** That is `KXR-40` of
 * `docs/process/KEEPER_PR20_REVIEW.md`, named with its document for the same
 * reason as above: the bare id is contested. Two lessons that
 * govern nothing and name each other satisfied this guard forever, and would
 * have gone on satisfying it: a citation ring is precisely the failure the
 * guard exists to prevent — prose accumulating in a new place with nothing tied
 * to it — wearing the evidence of its own usefulness. `KXR-10` was a pointer
 * satisfied by the register itself; this was a pointer satisfied by the
 * category itself.
 *
 * A lesson may still link to another lesson, and an unresolved one still fails.
 * What a sibling cannot do is be the only thing keeping a lesson alive.
 */
function cannotEvidenceUse(path: string, knowledgeDir: string): boolean {
  return (
    path === `${knowledgeDir}/index.md` ||
    path === `${knowledgeDir}/log.md` ||
    path.startsWith(`${knowledgeDir}/wiki/lessons/`)
  );
}

/**
 * Read the tree once and return every `[[lesson-…]]` in it, by file.
 * Exported because the one honest way to show a checker works is to show a
 * reader the same facts it worked from.
 */
export function lessonLinksInTree(
  repoRoot: string,
  knowledgeDir = 'knowledge',
): Map<string, Set<string>> {
  const root = resolve(repoRoot);
  const own = resolve(root, knowledgeDir);
  const byFile = new Map<string, Set<string>>();
  for (const file of walkTree(root, own)) {
    if (!TEXT_EXTENSIONS.some((ext) => file.endsWith(ext))) continue;
    const rel = relative(root, file).split('\\').join('/');
    let text: string;
    try {
      text = readFileSync(file, 'utf8');
    } catch {
      continue;
    }
    const ids = new Set<string>();
    LESSON_LINK.lastIndex = 0;
    let match = LESSON_LINK.exec(text);
    while (match !== null) {
      ids.add(match[1] as string);
      match = LESSON_LINK.exec(text);
    }
    if (ids.size > 0) byFile.set(rel, ids);
  }
  return byFile;
}

/**
 * **The whole check, as a pure function of the tree.**
 *
 * Order is deliberate: the frontmatter a lesson must carry, then both directions
 * of the link, then the captures, then the budgets. A page that is malformed
 * produces one finding about being malformed rather than a cascade about the
 * fields it has not got.
 */
export function scanLessons(opts: LessonScanOptions): LessonScanResult {
  const root = resolve(opts.repoRoot);
  const kdir = resolve(root, opts.knowledgeDir ?? 'knowledge');
  const kdirRel = relative(root, kdir).split('\\').join('/') || 'knowledge';
  const lessonsDir = join(kdir, 'wiki', 'lessons');
  const findings: LessonFinding[] = [];
  const add = (
    findingClass: LessonFindingClass,
    subject: string,
    evidence: string[],
    explanation: string,
    repair: string,
  ) => {
    findings.push({
      findingClass,
      severity: LESSON_SEVERITY[findingClass],
      subject,
      evidence,
      explanation,
      repair,
    });
  };
  const rel = (p: string) => relative(root, p).split('\\').join('/');

  // --- lesson pages -------------------------------------------------------
  const lessons: LessonPage[] = [];
  for (const file of walk(lessonsDir).filter((f) => f.endsWith('.md'))) {
    const path = rel(file);
    const { data, body } = readFrontmatter(readFileSync(file, 'utf8'));
    const nodeId = str(data.nodeId);
    const missing: string[] = [];
    // The pattern text is taken from the constraint rather than retyped beside
    // it: a message that can disagree with the check it explains is `KXR-12`.
    if (!LESSON_ID.test(nodeId))
      missing.push(
        `a nodeId matching ${LESSON_ID.source} — lowercase letters, digits and hyphens, and nothing else, because that is what a link to it can be written with`,
      );
    if (str(data.kind) !== 'lesson') missing.push('kind: lesson');
    const scope = str(data.scope);
    if (!(LESSON_SCOPES as readonly string[]).includes(scope))
      missing.push(`scope, one of ${LESSON_SCOPES.join(' or ')}`);
    const tags = strArr(data.tags);
    if (tags.length === 0) missing.push('at least one tag');
    const sources = Array.isArray(data.sources) ? data.sources.length : 0;
    if (sources === 0) missing.push('at least one source: the evidence it rests on');
    if (!Array.isArray(data.governs)) missing.push('governs: the files it governs');
    if (missing.length > 0) {
      add(
        'lesson_frontmatter_incomplete',
        nodeId || path,
        [path],
        `${path} is missing ${missing.join('; ')}.`,
        'A lesson carries the files it governs, the evidence it rests on, its scope and its tags. knowledge/SCHEMA.md states the shape.',
      );
      continue;
    }
    const page: LessonPage = {
      nodeId,
      path,
      title: str(data.title, nodeId),
      scope,
      tags,
      governs: strArr(data.governs),
      sourceCount: sources,
      status: str(data.status, 'current'),
      bodyBytes: Buffer.byteLength(body, 'utf8'),
    };
    lessons.push(page);

    for (const tag of tags) {
      if (!(LESSON_TAGS as readonly string[]).includes(tag))
        add(
          'tag_outside_taxonomy',
          nodeId,
          [path],
          `${nodeId} is tagged "${tag}", which is not one of the ${LESSON_TAGS.length} tags this wiki has: ${LESSON_TAGS.join(', ')}.`,
          'Use an existing tag, or add the new one to LESSON_TAGS and to knowledge/SCHEMA.md in the same commit.',
        );
    }
    if (page.bodyBytes > LESSON_BODY_BYTE_BUDGET)
      add(
        'lesson_page_over_budget',
        nodeId,
        [path],
        `${nodeId} is ${page.bodyBytes} bytes of body against a budget of ${LESSON_BODY_BYTE_BUDGET}; a page this size is holding more than one idea.`,
        'Split it into two lessons, each with its own id, governed files and tags.',
      );
    if (page.status === 'superseded')
      add(
        'superseded_lesson_not_folded',
        nodeId,
        [path],
        `${nodeId} is marked superseded. A superseded lesson is folded forward into the page that replaces it and deleted, not left standing beside it.`,
        'Move what is still true into the replacing lesson, repoint the governed files at it, and delete this page.',
      );
  }

  // **A stable id that two pages can claim is not an identity.** Everything
  // below resolves a link by id; with a duplicate, one of the two pages is
  // simply invisible and the link silently means the other.
  const byNodeId = new Map<string, LessonPage[]>();
  for (const lesson of lessons)
    byNodeId.set(lesson.nodeId, [...(byNodeId.get(lesson.nodeId) ?? []), lesson]);
  for (const [nodeId, claimants] of byNodeId) {
    if (claimants.length < 2) continue;
    const paths = claimants.map((c) => c.path).sort();
    add(
      'lesson_id_not_unique',
      nodeId,
      paths,
      `${claimants.length} pages claim the lesson id ${nodeId}: ${paths.join(', ')}.`,
      'Give one of them a new id and repoint the files it governs. A lesson id is an identity and is never renamed once it is in use.',
    );
  }

  const lessonIds = new Set(lessons.map((l) => l.nodeId));

  // --- both directions of the link ---------------------------------------
  const links = lessonLinksInTree(root, kdirRel);

  // Outward: a link in the tree that names no lesson.
  for (const [file, ids] of links) {
    for (const id of ids) {
      if (!lessonIds.has(id))
        add(
          'lesson_link_unresolved',
          id,
          [file],
          `${file} links to [[${id}]] and there is no such lesson page.`,
          `Create ${kdirRel}/wiki/lessons/${id}.md, or correct the link. A lesson a file depends on is not deleted while the file still names it.`,
        );
    }
  }

  // Back: a lesson that names a file, and the file that does not name it back.
  for (const lesson of lessons) {
    for (const governed of lesson.governs) {
      const target = resolve(root, governed);
      if (!existsSync(target)) {
        add(
          'lesson_governs_path_missing',
          lesson.nodeId,
          [lesson.path],
          `${lesson.nodeId} governs ${governed}, which is not a file in this repository.`,
          'Correct the path, or drop it from governs if the file has gone.',
        );
        continue;
      }
      if (!links.get(governed)?.has(lesson.nodeId))
        add(
          'lesson_link_not_returned',
          lesson.nodeId,
          [lesson.path, governed],
          `${lesson.nodeId} governs ${governed} and ${governed} never names [[${lesson.nodeId}]].`,
          `Put [[${lesson.nodeId}]] in ${governed} where the lesson applies, or drop the file from governs. A page that claims a file it is not tied to is how the two came apart every previous time.`,
        );
    }

    const referencedBy = [...links]
      .filter(
        ([file, ids]) =>
          ids.has(lesson.nodeId) && file !== lesson.path && !cannotEvidenceUse(file, kdirRel),
      )
      .map(([file]) => file);
    if (referencedBy.length === 0)
      add(
        'lesson_unreferenced',
        lesson.nodeId,
        [lesson.path],
        `Nothing names [[${lesson.nodeId}]]. The index and the journal do not count: they name every page by construction. Neither does another lesson page: two lessons naming each other govern nothing and keep each other alive.`,
        'Tie it to the code or document it is about, or delete it. A lesson nothing reaches is prose in a new place.',
      );
  }

  // --- captures -----------------------------------------------------------
  const captures: Capture[] = [];
  for (const file of walk(join(kdir, 'inbox')).filter((f) => f.endsWith('.capture.md'))) {
    const path = rel(file);
    const { data } = readFrontmatter(readFileSync(file, 'utf8'));
    const captureId = str(data.captureId);
    const state = str(data.state);
    const destination = str(data.destination);
    const missing: string[] = [];
    if (!captureId) missing.push('captureId');
    if (!str(data.title)) missing.push('title');
    if (!str(data.observedAt)) missing.push('observedAt');
    if (!str(data.observedBy)) missing.push('observedBy');
    if (strArr(data.evidence).length === 0) missing.push('evidence: at least one path or command');
    if (!destination) missing.push('destination: the lesson it probably belongs to');
    if (state !== 'open' && state !== 'ingested') missing.push('state: open or ingested');
    if (missing.length > 0) {
      add(
        'capture_malformed',
        captureId || path,
        [path],
        `${path} is missing ${missing.join('; ')}.`,
        'knowledge/inbox/README.md states the shape. A capture is small on purpose; it is not small enough to leave out what it is evidence of.',
      );
      continue;
    }
    captures.push({ captureId, path, destination, state });
    if (state === 'ingested' && !lessonIds.has(destination))
      add(
        'capture_malformed',
        captureId,
        [path],
        `${captureId} says it was ingested into ${destination}, and there is no such lesson page.`,
        'An ingested capture names the page it became. While the page does not exist the capture is still open.',
      );
  }

  // --- the loader ---------------------------------------------------------
  const loaderPath = join(kdir, 'LOADER.md');
  let loaderBytes: number | null = null;
  if (existsSync(loaderPath)) {
    loaderBytes = statSync(loaderPath).size;
    if (loaderBytes > LOADER_BYTE_BUDGET)
      add(
        'loader_over_budget',
        rel(loaderPath),
        [rel(loaderPath)],
        `${rel(loaderPath)} is ${loaderBytes} bytes against a budget of ${LOADER_BYTE_BUDGET}: ${loaderBytes - LOADER_BYTE_BUDGET} over.`,
        'Take content out of the loader and put it in a page the loader says how to find. The loader says where knowledge is; it never holds any.',
      );
  }

  // --- raw sources enough pages now rest on -------------------------------
  const referencesPerSource = new Map<string, Set<string>>();
  for (const file of walk(join(kdir, 'wiki')).filter((f) => f.endsWith('.md'))) {
    const { data } = readFrontmatter(readFileSync(file, 'utf8'));
    const nodeId = str(data.nodeId);
    if (!nodeId) continue;
    const refs = new Set<string>();
    for (const source of Array.isArray(data.sources) ? data.sources : []) {
      const ref = str((source as Record<string, unknown>)?.ref);
      if (ref.startsWith('src-')) refs.add(ref);
    }
    for (const ref of refs) {
      const set = referencesPerSource.get(ref) ?? new Set<string>();
      set.add(nodeId);
      referencesPerSource.set(ref, set);
    }
  }
  for (const file of walk(join(kdir, 'raw')).filter((f) => f.endsWith('.source.md'))) {
    const { data } = readFrontmatter(readFileSync(file, 'utf8'));
    const sourceId = str(data.sourceId);
    if (!sourceId) continue;
    const pages = referencesPerSource.get(sourceId)?.size ?? 0;
    if (pages >= RAW_SOURCE_COMPILED_THRESHOLD && str(data.ingestionState) !== 'compiled')
      add(
        'raw_source_ready_to_compile',
        sourceId,
        [rel(file)],
        `${pages} wiki pages rest on ${sourceId} and its record still reads ingestionState: ${str(data.ingestionState) || 'unset'}.`,
        'Advance the record to compiled and append the line to knowledge/log.md, per knowledge/SCHEMA.md. The pages are the way in now, not the source.',
      );
  }

  findings.sort(
    (a, b) => a.findingClass.localeCompare(b.findingClass) || a.subject.localeCompare(b.subject),
  );
  return {
    lessons: lessons.sort((a, b) => a.nodeId.localeCompare(b.nodeId)),
    captures: captures.sort((a, b) => a.captureId.localeCompare(b.captureId)),
    findings,
    blocking: findings.filter((f) => f.severity === 'blocking').length,
    loaderBytes,
  };
}
