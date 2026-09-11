# OD-0013 — `main` stays unprotected until the owner upgrades (Tier 3)

Status: **Accepted.** Issued by the owner on 2026-09-11, answering `KP3-06`, open across three Keeper reviews. The owner's words are the source and are quoted verbatim below; this file transcribes them and decides nothing itself. Filed under the mechanism in `OD-0006-recording-owner-decisions.md`. Authority (layer 1) comes from the owner's acceptance, not from this transcription, and the owner reading this file is the only way a false one is found.

## The owner's words

> "ill get pro but ill do it later. Can we continue with our plan plese."

## What was measured, not assumed

The owner created a classic branch protection rule on `main` and GitHub answered: *"Your protected branch rules for your branch won't be enforced on this private repository until you move to a GitHub Team or Enterprise organization account."* He then converted it to a ruleset, which reported `Active` while displaying: *"Your rulesets won't be enforced on this private repository until you move to GitHub Team organization account."*

A session queried the API from this container and received, for `GET /repos/dniachini-droid/Virgil-mission-control/rulesets`:

> `403 — "Upgrade to GitHub Pro or make this repository public to enable this feature."`

The two gates are different and both are real: **classic** branch protection on a private personal repository needs GitHub Pro; **rulesets** on a private repository need a Team organization. The rule the owner built is therefore the right one and is inert until the account is upgraded.

**What no session verified:** that the rule is not enforced. The only conclusive test is a push to `main`, which `CLAUDE.md` forbids. What is recorded above is GitHub's own statement, three times, and not an observation of a refused push.

## The decision

`main` stays unprotected for now. The owner intends to buy GitHub Pro, at which point the existing classic rule becomes enforced without further work. The ruleset should be deleted when that happens: it will never enforce on a personal account.

## What this costs, plainly

Every green check on a pull request is **advisory**. Nothing at GitHub's end stops a direct push to `main`, by the owner or by any session holding a token that can write to the repository. `apps/mission-control/test/required-checks.test.ts` is named *"the gate runs in full before anything can merge"*; until this is resolved that title describes the arrangement of a workflow file and not the configuration of the repository, which is exactly what `KP3-06` says.

What stands in the meantime is not nothing, and is not a substitute either: `.github/workflows/instruct.yml` refuses the default branch in its first step, before checkout and before any agent exists, and holds `contents: write` and no other permission. That constrains the one automated path. It does not constrain a person, and it is enforced by a file that a person can edit.

`KP3-06` therefore remains **open**, accepted with intent, and is not to be recorded as closed until the API says `main` is protected.
