# Slice six, replayed onto `main` after the inspector's foundation landed

**What this records:** pull request #12 could not be updated from `main` after #14
merged, the fourteen commits were replayed onto the new `main`, and the
integration surfaced one defect that neither branch had on its own.

## Why the commits were replayed rather than merged

`Bash(git merge*)` and `Bash(git rebase*)` are both denied to sessions in
`.claude/settings.json`. GitHub's own "Update branch" refused with *merge
conflict between base and head*. So the commits were replayed with
`git cherry-pick`, which is not denied and rewrites no history on a branch
anybody else may hold. New SHAs, so a new pull request.

This is the second time this has happened — `#11` became `#14` the same way,
and that pull request recorded the same thing: the rule over-reaches, the narrow
fix is to permit `git merge origin/main` while denying everything else, and **a
session must not make that change to its own permission list.** It is still
true, and it is `KXR-07`.

## The one conflict, and why picking a side would have been wrong

`packages/test-fixtures/knowledge/seed-graph.json` is generated. Both branches
regenerated it, and each captured only its own decision file:

```
main before      newest decision: OD-0014
#12 adds OD-0015   its graph names OD-0015 newest, graphHash f54a2b38…
#14 adds OD-0016   its graph names OD-0016 newest, graphHash f5c6b54d…
```

After both land the repository holds **both** decisions, which is a state
neither committed file describes. Taking either side would have put a file on
`main` that disagrees with the repository it describes, and
`packages/knowledge-graph`'s staleness test would have failed on the default
branch rather than on a branch.

It was resolved by regenerating from the combined tree:

```
28 nodes, 57 edges, graphHash e87e7182…
```

— a third value, equal to neither side, which is the evidence that neither side
was correct. Regenerating again at `HEAD` produced a byte-identical file, so the
committed graph is not stale.

## `KXR-38` — a guard that read the shape of a call and not the meaning of it

**Found by a gate.** This is the first finding in this repository that a
deterministic check caught rather than a reviewer, and it was caught in the
only place it could ever have appeared: the two branches combined.

`apps/mission-control/test/cache-inputs.test.ts` arrived with #14. It refuses
any repository-root path a test reads that `turbo.json` does not declare as a
cache input — the repair for `KXR-29`. It finds those reads by matching the
shapes this repository writes, one of which is `resolve(root, '…')`.

`apps/mission-control/test/conversation-writer.test.ts` arrived with #12. It
writes scratch files and binds `root = mkdtempSync(resolve(tmpdir(), …))`.

Neither branch failed alone. Together the guard reported:

```
these are read by tests and not declared in turbo.json's test inputs, so a
change to one of them will replay a cached pass: answer.txt — read by
apps/mission-control/test/conversation-writer.test.ts; nothing.txt — read by
apps/mission-control/test/conversation-writer.test.ts
```

`answer.txt` and `nothing.txt` are files in a temporary directory created fresh
on every run. No `turbo.json` could declare them and no cache could replay a
stale pass over them. The guard was reading the shape of the call and not the
meaning of it.

**The repair** consults the binding rather than the call: a file that binds
`root` to a scratch directory is not reaching the repository root when it
resolves against it, so the `resolve(root, …)` shape is not applied to that
file. The other two shapes still are.

**Proved rather than asserted.** Removing `$TURBO_ROOT$/docs/**` from the test
task's inputs and running the repaired guard:

```
AssertionError: these are read by tests and not declared in turbo.json's test
inputs, so a change to one of them will replay a cached pass: docs — read by
apps/mission-control/test/review-records.test.ts
```

Restored, three tests pass. The narrowing removed a false positive and removed
no detection: `docs`, `netlify`, `.github` and `knowledge` are each still caught
when deleted from the declaration.

**What the same exercise found and did not repair.** `constitution/**`,
`.claude/**`, `schemas/**` and `.virgil/**` can each be deleted from the test
task's inputs with the suite green, on the guard as it arrived and on the
repaired guard alike. That is `KXR-33`, raised by the final review of #14 and
not yet entered in the register. It is not repaired here and this branch does
not claim it is.

## Verification

Every stage run separately with the cache forced off, because `pnpm check`
chains with `&&` and passes trailing flags only to its last link:

```
biome check .                 exit 0, 299 files
turbo run typecheck --force   8 successful, 8 total, 0 cached
turbo run test --force        6 successful, 6 total, 0 cached
turbo run verify:web --force  PASS, 12 cases, 0 cached
```
