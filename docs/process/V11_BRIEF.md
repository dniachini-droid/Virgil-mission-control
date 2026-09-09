# V11 — the owner's iPhone-first design brief, 9 September 2026

Branch: `claude/virgil-mobile-v11`, named by the owner. One branch, no worktrees, no merge to `main`.

## Status of the earlier decision this replaces

`docs/process/PHASE_1_BACKLOG.md` records the owner's decision of a few hours earlier — *"let's stop at
V10 and start building the product"* — and this brief supersedes its ordering. It is not a reversal:
V11's second half **is** the product step (the full-screen conversation and agent windows, capable of
carrying a real session later), and its first half is the mobile composition that the product needs in
order to be usable on the device the owner says he will use most. The five items that decision named as
deliberately unfinished stay unfinished unless V11 happens to pass through them.

## The preservation contract

V10 must remain openable and unchanged so the owner can compare and go back. Concretely, none of the
following may be edited, renamed or refactored:

- the entry `apps/mission-control/owner.html` and `src/owner/main-owner.tsx`;
- the HashRouter routes it serves: `/` (the world), `/s1`, `/spike/foundry`, `/spike/mind`;
- `vite.owner.config.ts`, `owner-build/inline.mjs`, `owner-build/reproduce.mjs`;
- the `build:owner`, `verify:owner` and `reproduce:owner` scripts;
- every committed artifact in `docs/process/PHASE_1_owner-builds/` and its `.sha256`.

V11 is additive: its own entry, route, build config, build and verify scripts, and its own artifact.
V11's build also reaches V10's world at a route of its own, so the two can be compared without two
downloads. **The default approved version does not change without the owner saying so.**

## What V11 must preserve, in the owner's words

The living 3D celestial command centre; Virgil and the three specialists; their individual workstations;
the detailed animated in-world screens; selecting characters and opening their windows; the scripted
demonstration; and the serious underlying engineering and governance information. *"This is a visual and
interaction refinement — not a replacement with a generic dashboard."*

## Stages

Each stage ends in an artifact the owner can open, because the brief is several passes of work and
delivering it as one is how things arrive half-considered.

1. **Composition and interaction.** A dedicated portrait-iPhone composition rather than a shrunken
   desktop camera; an intentional landscape secondary; `viewport-fit=cover`, `100dvh`, the safe-area
   insets, the Dynamic Island and the home indicator; 44 px touch targets; tap distinguished from
   gesture; deliberate camera transitions into a selection; the development chrome moved out of the
   ordinary experience into a hidden menu.
2. **The in-world screens.** Thin bevelled ivory-and-gold bezels, deep sapphire-black glass, restrained
   illuminated edges, controlled bloom, layered graphics; per-agent art direction — Virgil's gold orbital
   paths and constellation dependencies, the Fabricator's assembly diagrams, the Prover's scanning and
   test nodes, the Keeper's violet archival cards and provenance chains; 1024–2048 px display textures
   scaled by device tier, with mipmaps and anisotropy.
3. **The windows.** Full-screen agent and Virgil views that lead with what happened, what it means, what
   happens next, what the owner can do, and evidence on demand — never a raw table first. A real
   composer, the iPhone keyboard handled, scroll preserved, reduced motion respected, screen-reader
   labels and focus order. Architecture capable of carrying a real session later, with the absence of one
   stated truthfully rather than faked.
4. **Performance, the twelve review states, and the verification evidence** the brief lists.

## Three cautions recorded before the work, not after

1. **Removing the build SHA and footer costs the project its only build-identity signal.** That footer's
   stage line is what finally diagnosed the day the owner was served a stale build and this session gave
   four wrong answers in a row. The brief allows development-only chrome to live in a hidden menu, so the
   footer goes there — and a discreet version marker should remain reachable in the ordinary interface.
   If the owner wants it truly invisible, that is his call and the cost is slower diagnosis.
2. **KTX2, Draco and Meshopt are to be assessed, not assumed.** Each needs a transcoder or decoder
   inlined into a single `file://` document that is already over the mobile transfer budget
   (`docs/architecture/PERFORMANCE_STRATEGY.md`). The existing bespoke quantised payload may beat them
   under this constraint. Measure, then choose, and record the numbers either way.
3. **No iPhone exists in this environment.** Every iPhone check is a simulated viewport in headless
   Chromium. Simulated checks are recorded as simulated; real-device checks are recorded as **not
   performed**, never as met. `docs/decisions/OD-0005-phase-1-visual-checks-and-reference.md` already
   requires exactly this of the two graphics-hardware checks and the same honesty applies here.
