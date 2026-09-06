# Role performance bible

Amendment 1 deliverable 3. Data: `packages/visual-language/data/role-performance.json` validated against `schemas/role-performance-bible.schema.json`; each role defines silhouette, station, instruments, locomotion, working ritual, handoff behaviour, idle behaviour, prohibited-action representation, colour-free recognisability, colour accent and what it never touches. Tests check that all fourteen entries are distinct and that idle behaviour never describes work.

## Approved character direction (owner decision, transcribed)

The owner approved four character designs (`assets/concepts/characters/`: Virgil, Fabricator, Prover, Keeper) as charming, cute, compact, screen-faced space robots with funny and distinctive role equipment, recorded in `docs/decisions/proposed/OD-0002-art-direction-checkpoint.md`. Where a silhouette below (for example "tall, armless" Virgil or "hooded, no arms" Keeper) conflicts with an approved sheet, the sheet governs once the decision is accepted; the rituals, stations, prohibited-action representations and "never touches" columns stand. The data twin `role-performance.json` has not been rewritten in the consolidation; that is Phase 1 work under the accepted decision.

## Ensemble rules

A premium stylised ensemble. Silhouette carries identity; colour is an accent. Stations are architecture, not backdrops: each has instruments that light only under a grant. Every role has a visible way of refusing a prohibited action (locked arms, folded vanes, a prohibition glyph, a forge that stays cold) so that the world shows authority stopping rather than pretending it never tried.

## Permanent core crew

| Role | Silhouette | Station | Signature ritual | Never touches |
|---|---|---|---|---|
| Virgil | tall, armless, chest-height orbital ring, guiding vanes | central observatory dais under a dome with a projected orrery | opens one lane at a time; becomes almost still when blocked and lights one route | code, fabrication, tests, seals, airlock, deployment |
| Cartographer | low, hunched, compass drones at the shoulders, filament spool | dark stellar map table with a horizon rail | stakes landmarks, spools a perimeter, leaves decisions as closed gates | architecture, code, opening owner gates |
| Architect | elongated, floating diagonally, projection limbs without hands | zero-gravity blueprint chamber | unfolds layers, casts protected volumes as dark metal, ends with go/no-go | production modules, tests, owner decisions |
| Fabricator | compact, four tool arms, code loom, forearm light-forge | kinetic assembly dock inside an isolated bay | read, search, edit, accumulate, stage, seal, push, corridor | seals, airlock, deployment, tokens, files outside permitted paths |
| Prover | ring torso, radial spines, two precise manipulators | radial verification chamber with a mirror bay | one arc per check; seeds defects only into the mirror | sealed candidate, production behaviour, verdicts |
| Keeper | hooded, no arms, orbiting lenses, hanging spectrograph | separate inspection station across a visible gap | orbits lenses over the exact SHA; pins findings; one verdict | candidate contents, tests, airlock |
| Arbiter | bilateral, two evidence pans on vanes, one central eye | symmetrical tribunal with opposing tracks and a contract forge | reproduces, consolidates with ids intact, rejects unsupported, forges one contract | candidate, repair beyond the limit |

## Conditional specialists

Dormant stations exist as architecture; workers appear only when the risk classification commissions them.

| Role | Silhouette | Station | Refusal |
|---|---|---|---|
| Domain Verifier | prism rack, standard rod, chest ledger | reference station | ledger will not seal an unverifiable claim |
| Breaker | squat, armoured, launcher arms, containment collar | contained impact range with a disposable projection | launchers cannot aim past the collar |
| Integrator | long limbs with interface collars, shoulder protocol bridge | inter-station coupling yard | the aligner measures and does not bend |
| Interface Keeper | slight, multi-facet viewport visor | responsive projection theatre | an unrendered facet stays dark |
| Security Sentinel | broad shield, key belt, sealed back vault, probe filaments | boundary post | the vault has no display surface |
| Transport Inspector | twin-bodied, facing local and remote | mirrored docks with hash beacons | comparator has no manual override |
| Performance Examiner | pendulum instrument, gauges along the arms | temporal and gravimetric laboratory | tier switch cannot remove identity, evidence or gate meaning |

## Idle and ambient

Idle workers shift posture occasionally with tools dark. They never type, scan, fabricate, weld or handle an artifact. When Virgil is blocked it is almost completely still and presents exactly one illuminated route or decision.
