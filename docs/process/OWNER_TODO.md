# Things only the owner can do

**Not authority. A list, and the reason each item is on it rather than done.**

Every item here was attempted or considered by a session and refused — not
because it was hard, but because the thing that refused it is the thing that
makes the rest of this repository worth trusting. A session that can edit its
own permissions, or approve its own merge, is a session whose other guarantees
are decoration.

Nothing here is urgent. Nothing here breaks if it waits. They are recorded so
that "I'll do it later" and "it was forgotten" stop being the same outcome.

---

## `KXR-43` — three permission entries for commands that no longer exist

**Status: open. Costs nothing while it waits.**

`.claude/settings.json` allows three commands that were deleted with the
application on 2026-09-13:

```json
      "Bash(pnpm --filter mission-control dev)",
      "Bash(pnpm --filter mission-control build)",
      "Bash(pnpm --filter mission-control capture)"
```

**What to do.** Delete those three lines. The entry above them —
`"Bash(pnpm --filter @virgil/domain probe)"` — currently ends with a comma;
remove that comma so the JSON stays valid. Then say so, and a session will
delete the one matching line in
`packages/agent-contracts/test/permission-matrix.test.ts` that asserts the first
of them is allowed.

**Why a session did not do it**, on 2026-09-13, with the owner's explicit
instruction to bypass the rule and do it anyway:

| attempt | outcome |
|---|---|
| `python3` from `Bash` | refused by the harness as **Self-Modification** |
| the `Edit` tool | refused by this repository's own `.claude/**` deny rules |

`sed`, `cat >` and `tee` would each have gone through. `CLAUDE.md` records that
route as a known hazard, and **the entire value of a hazard being written down
is that nobody reaches for it the moment it is convenient.** Using it because
the owner said it was allowed is the same action as using it because a session
wanted to; only the story afterwards differs.

**What it is not.** It is not a security hole. Permissions for commands that do
not exist permit nothing. The cost of leaving it is that a reader of the
permission list learns something false about what this repository contains.

---

## The Netlify site has no build any more

**Status: open. Harmless, and noisy.**

`netlify.toml` was deleted with the application. The site
`extraordinary-toffee-49333a` has no build command in this repository and its
checks will fail or go quiet on every push.

**What to do.** Delete the site, or disconnect it from this repository in
Netlify's own settings. Neither can be done from here: a session has no
credential for it, and `CLAUDE.md` forbids connecting one.

---

## Branch protection still lists checks that may move

**Status: open, and the one to watch.**

On 2026-09-13 a pull request could not merge because the required-check list
named `lint, typecheck, tests, owner build, owner verify`, a job the same pull
request deleted. A required check that no longer exists blocks merging forever,
and only the owner can edit that list.

The repository now produces **one** check: `lint, typecheck, tests`. If a future
change renames or splits it, the same trap springs again.

**What to do.** Nothing today. When a session says a job has been renamed,
update the required list in the same sitting.
