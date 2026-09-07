# Owner art-direction checkpoint

Required by Amendment 1 ("Phase 0 must define an explicit owner art-direction checkpoint before Phase 1 is considered ready"). Phase 1 is not ready until this checkpoint is recorded as an owner decision (proposed id OD-0002).

## What the owner reviews

On a machine with a GPU, at desktop tier, in a current Chromium or Firefox:

```sh
pnpm install
pnpm --filter mission-control dev
```

Open `/spike/foundry` and step 00 to 10; open `/spike/mind` and step 00 to 09. Toggle reduced motion, camera hold and tiers (desktop, mobile, constrained). Compare with `docs/art-direction/spikes/*.png` (software renders) and with `docs/art-direction/ART_BIBLE.md`.

## Checklist (Amendment 1 visual-quality acceptance)

The spikes fail if they read as any of: primitive spheres presented as a final visual language; a normal dashboard with a decorative 3D background; generic glass panels; cartoon clip-art astronauts; interchangeable coloured avatars; uncontrolled particles and bloom; text boxes doing all meaningful communication; a folder browser disguised as the Mind; a basic node graph without environmental meaning.

Judge separately:

| Question | Pass condition |
|---|---|
| Signature look | The nebula, lanes, bloom and materials read as premium psychedelic space, not a stock scene |
| Legibility | Every state is readable by form and label with colour removed; labels crisp at desktop tier |
| Evidence coupling | Every visible change corresponds to the event in the Evidence View; the refused step shows no motion |
| Two worlds | The Mind reads as a knowledge environment with distinct forms per epistemic class, not a graph widget |
| Characters | The silhouette stand-ins are acceptable as placeholders for Phase 1 modelling and the role bible direction is right |
| Motion | Ambient life is quieter than work; nothing mimes work; reduced motion loses no state |
| Mobile | The mobile tier is a real version of the world, not a card list |

## Possible verdicts

- PASS: the art bar is credible; Phase 1 may start under `PHASE_1_BRIEF.md`.
- PASS WITH DIRECTION: credible with specific changes listed in the decision; Phase 1 starts with those changes as acceptance criteria.
- FAIL: not credible; Phase 0 remains open and a bounded art-direction repair is authorised before any Phase 1 work.

## Recording the decision

Fill in `docs/decisions/proposed/OD-0002-art-direction-checkpoint.md`, move it to `docs/decisions/OD-0002-art-direction-checkpoint.md`, and commit. Only the owner performs that move; sessions are denied writes to accepted decision files. The knowledge layer then ingests it as a raw source.

## Outcome

The owner inspected the Phase 0 spikes and the later Phase 0.5 runtime rebuild and rejected both as an accepted art baseline. The owner's binding visual direction (the hybrid reference `docs/art-direction/approved/visual-canon/03-approved-hybrid.png`, Direction B as the strongest stylistic influence, the four approved character sheets, and the rules for what "cute" means and does not mean) is transcribed in `docs/decisions/proposed/OD-0002-art-direction-checkpoint.md`. The checklist row "cartoon clip-art astronauts" is read per that decision: generic clip art and interchangeable avatars fail; charming, compact, screen-faced space robots with distinctive role equipment are the direction. The file stays at `proposed/` until the owner moves it; no procedural visual rebuild starts before then, and no session awards itself an artistic pass.
