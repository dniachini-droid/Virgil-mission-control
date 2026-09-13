# The cache guard, and the shape it could not see — `KXR-38`

**Authority: layer 4.** A record, not a decision.

`packages/repo-checks/test/cache-inputs.test.ts` refuses any repository-root
path a test reads that `turbo.json` does not declare as a cache input. Without
it, a test's inputs can change while turbo sees no change at all, and a cached
pass is replayed — which happened, and three commit messages claimed `pnpm
check` had passed when it had not been run.

## `KXR-38` — the guard read the shape of a call and not the meaning of it

**The first finding in this repository caught by a gate rather than a review.**
Until it, the register's own "found by" column read `review` on every row.

The guard finds root reads by matching the shapes this repository writes, one
of which is `resolve(root, '…')`. A test that writes scratch files binds
`root = mkdtempSync(resolve(tmpdir(), …))` and resolves against *that*. The
shapes are identical; the meanings are not.

Combined, the guard reported two files in a temporary directory as undeclared
cache inputs. Both are created fresh on every run. No `turbo.json` could declare
them and no cache could replay a stale pass over them.

**The repair consults the binding rather than the call:** a file that binds
`root` to a scratch directory is not reaching the repository root when it
resolves against it, so that shape is not applied to it. The other shapes still
are.

**Proved rather than asserted.** With `$TURBO_ROOT$/docs/**` removed from the
test task's inputs:

```
AssertionError: these are read by tests and not declared in turbo.json's test
inputs, so a change to one of them will replay a cached pass: docs — read by
packages/repo-checks/test/review-records.test.ts
```

Restored, it passes. `docs`, `netlify`, `.github` and `knowledge` were each
still caught when deleted from the declaration. The narrowing removed a false
positive and removed no detection.

`review-records.test.ts` assumed every `KXR` finding came from a Keeper, so
*held* meant *quoted in a kept review*. A gate-caught finding has no review, so
a `gate` row — and later an `owner` row — is held by the document its own
pointer names. The requirement is unchanged in substance: **a finding whose text
is in no file still fails.**

---

*This record was written on 2026-09-13. `KXR-38`'s text previously lived in a
document about the application's conversation slice, which was deleted with
everything else belonging to the application. The finding is about the build
system's own cache guard and outlived it.*
