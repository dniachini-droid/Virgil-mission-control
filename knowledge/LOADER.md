# How to find what this repository knows

Directions, never content. Held to 2,000 bytes by `scanLessons`
(`packages/knowledge-graph/src/lessons.ts`). If it needs more, the extra belongs
in a page this file says how to reach.

**Authority first.** `CLAUDE.md` governs every session and outranks everything
here. The wiki explains; it never overrides and never holds live values.

## Where to look

- **A question about how this project works** — `knowledge/index.md`, then the
  page it names. Every claim on a page cites its source.
- **A question about what went wrong before, and what stops it now** —
  `knowledge/wiki/lessons/`. One page per lesson, each naming the files it
  governs.
- **Working in a file and want to know what is known about it** — search that
  file for `[[lesson-` . The link resolves to a page or the check fails.
- **What is open right now** — `docs/process/FINDINGS.md`. Not the wiki.
- **Live state** — Git, GitHub, the read model. Never the wiki.

## While you work

Learned something worth the next session knowing? Write one capture and keep
going: `knowledge/inbox/<id>.capture.md`, shape in `knowledge/inbox/README.md`.
Do not stop to write a page. A capture is raw material, not a page, and must not
be read as one.

## Turning captures into pages

`knowledge/SCHEMA.md` is the shape and the rules. Briefly: a lesson has a stable
id beginning `lesson-`, the files it governs, the evidence it rests on, `scope:
repository` or `general`, and tags from the closed list. The file it governs
names it back — both directions, or it rots.

Split a page holding two ideas. Fold a superseded lesson forward and delete it;
do not annotate it.

## Check it

```sh
pnpm --filter @virgil/knowledge-lint run lint
```
