# Epistemic visual contract

Deliverable 11. Data: `packages/visual-language/data/epistemic-contract.json`, validated against `schemas/epistemic-visual-projection-contract.schema.json`. Tests: `packages/visual-language/test/contracts.test.ts`.

| Class | Authority rank | Stability | Form | Colour token | Mark |
|---|---|---|---|---|---|
| immutable_raw_evidence | 9 | 9 | sealed source artifact: closed monolith or tablet with an engraved hash band | evidenceIce | — |
| owner_approved_decision | 9 | 9 | sealed monument on a plinth with an owner seal glyph | ownerGold | owner seal (form) |
| deterministically_verified_fact | 6 | 8 | solid structure carrying a machined signature band | signalLime | machine signature band (form) |
| live_operational_signal | 6 | 0 | moving pulse packets on a lane; no body | signalCyan | — (non-persistent) |
| durable_compiled_knowledge | 4 | 6 | solid faceted celestial structure with continuous edges | starWhite | — |
| contested_claim | 4 | 3 | bifurcated node with a standing interference lattice | signalAmber | — |
| superseded_claim | 3 | 3 | faded intact structure in a historical orbit with a successor arrow | historyAsh | — |
| ai_generated_hypothesis | 2 | 2 | translucent wireframe projection with dashed edges | hypothesisGlass | — |
| unverified_claim | 2 | 1 | incomplete geometry with a frayed tether stub | dustRose | — |

Tether states: intact (continuous line), broken (frayed fault geometry with glyph), stale (dashed with hash-mismatch glyph), absent (stub only).

Invariants (tested):

1. Visual stability never exceeds that of a class with strictly higher authority rank (the two rank-9 classes are peers).
2. Every class has a distinct form and a distinct pattern; colour is never the only difference.
3. Only the live signal is non-persistent; it never becomes a memory object.
4. Only the owner decision and the verified fact carry an authority mark.
5. The superseded class always renders its successor tether; nothing is culled to tidy the galaxy.
6. Rendering reads the class from the provenance graph and never assigns or upgrades it.

Selecting any node reveals compiled explanation, type and authority class, supporting and contradicting sources, exact provenance links, dates compiled and last verified, related concepts, supersession history, decisions and code surfaces affected, maintaining agent or skill, and verification or contested status.
