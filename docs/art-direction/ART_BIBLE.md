# Art bible

Deliverable 13. Governs both worlds. Source: master commission section 5 and Amendment 1 (sections A to S). Data twins: `packages/visual-language/data/tokens.json`, `epistemic-contract.json`, `animation-grammar.json`, `role-performance.json`. Companion documents: `EPISTEMIC_VISUAL_CONTRACT.md`, `OPERATIONAL_ANIMATION.md`, `ROLE_PERFORMANCE_BIBLE.md`, `docs/architecture/TWO_WORLDS.md`, `docs/architecture/PERFORMANCE_STRATEGY.md`.

## 1. Thesis of the look

A psychedelic orbital observatory that governs real work. Surreal scale and colour; exact, legible evidence. The eye should first read the state of the work, then enjoy the world. Every beautiful thing is also a fact: a nebula's hue follows the workflow state palette, a lane glows because a real handoff is in transit, a monument is gold because an owner decided.

Reference feelings, not assets: a premium science-fiction strategy game's command layer; the quiet of a deep-space observatory; a living map of software; flight control for digital labour; an audit trail you can walk through.

## 2. Colour

Palette tokens are in `tokens.json`. Ground: `void` and `deepSpace`, near-black indigo, never pure black. Nebulae: `nebulaViolet`, `nebulaMagenta`, `nebulaTeal`, `dustRose` in slow gradients with restrained volumetric density. Signals: `signalCyan` (activity), `signalAmber` (incomplete, contested, stale), `signalLime` (verified pass), `signalCoral` (adversarial), `faultRed` (proven failure), `quarantineViolet` (held), `ownerGold` (owner authority only; nothing else may be gold), `sealBrass` (bounded repair authority), `evidenceIce` (review and evidence), `historyAsh` (superseded), `hypothesisGlass` (proposals). Labels: `labelPaper` on `labelInk` plates for guaranteed contrast.

Rule: colour is a secondary channel. Every state has a form (`stateForm`), a label and, where relevant, a pattern or motion. Removing colour must leave the state readable. Gold is reserved for the owner; a renderer that colours anything else gold violates the contract.

## 3. Lighting

One key light per world: in the Foundry a cool key from the station core with warm bioluminescent fill on docks; in the Mind a soft omnidirectional glow from the galaxy centre with rim light on sealed sources. Emissive materials carry the state colour; non-emissive surfaces are dark metal and iridescent ceramic with physically based roughness so bloom has something to catch without washing out. Bloom threshold ≥ 0.8, intensity ≤ 0.55; label plates sit above the threshold luminance so bloom never blurs text (`tokens.bloom`). Volumetric fog is restrained and never covers a selectable object.

## 4. Materials

- Station and dock: brushed dark alloy, subtle anisotropic highlights, emissive seams in the state colour.
- Capsule: tamper-evident hull with a machined SHA band; sealed capsules are opaque and specular; unsealed modules are translucent.
- Verification bands: thin luminous rings with etched check ids.
- Quarantine lattice: rigid faceted matte violet; incomplete-evidence field: open thin frame with a visible gap.
- Owner airlock: heavy interlocked plates with a single gold keyway.
- Knowledge forms: crystalline monoliths (specifications), stellar tablets (research), holographic plates (images), golden sealed monuments (decisions), structured lattices (datasets), faceted opaque structures (compiled knowledge), wireframe glass (hypotheses), split nodes with interference lattices (contested), desaturated intact structures (superseded), incomplete geometry with frayed stubs (unverified).
- Signature cosmic effects use custom shaders: fbm nebula, iridescent thin-film energy fields, emissive transit lanes with travelling packets, star field with parallax layers, controlled chromatic edge on the post pass.

## 5. Camera

Overview: wide orbital shot with the observatory centred and stations arranged in a ring; the Mind gateway at the ring's edge. Detail: a station or a capsule fills a third of the frame with its evidence plate visible. Transitions reveal spatial relationships (dolly along a lane, orbit around a station) and never cut to black to hide loading. Restrained cinematic emphasis is reserved for commit sealing, push transit, verification signature, review verdicts, quarantine, eligibility key, owner merge, deployment and the gateway crossing. The user can follow an artifact, pin a worker, stay in overview or suppress automatic travel; the camera never seizes control twice within ten seconds and never rolls.

## 6. Motion

Four layers (`OPERATIONAL_ANIMATION.md`): tool activity, git manufacturing, governance and review, and ambient life. Authenticated motion happens only from a typed event with its required evidence; durations 350 to 2,600 ms. Ambient motion is slow (angular speed under 0.6°/s), non-essential, never attached to instruments, artifacts, tethers or gates, and idle workers never mime work. State changes are legible without motion. Reduced motion replaces travel with fades, path illumination and before/after poses; no essential state disappears.

## 7. Environment

Foundry: the central observatory, one station per project in a ring, docking bays as unfolded wings, a remote station across a visible gulf, the scanner array and inspection station as separate structures with a real gap between them, a quarantine field below the ring, repair docks beside the fabrication bay, the owner airlock at the core, the launch gate on the outer edge, the Mind gateway as a luminous threshold. Mind: the Archive Nebula (dense, dark, sealed objects in drifting dust), the Synaptic Forge (a bright working volume between nebula and galaxy), the Living Knowledge Galaxy (structures arranged by kind: principles as bright reference stars, architecture as geometric orbitals, roles as constellations, decisions as monuments, lessons as persistent structures, open questions as anomalies, contradictions as turbulent fields, superseded material in an outer historical orbit).

## 8. Character language

A serious ensemble, recognisable by silhouette, station, instruments, locomotion, ritual, handoff, idle and prohibited-action behaviour (`ROLE_PERFORMANCE_BIBLE.md`). Stylised humanoids, semi-organic machines, drones and hybrids are all permitted; interchangeable coloured avatars are not. Each role has a colour accent, but the silhouette carries identity.

## 9. Information surfaces

Evidence View, drawers, timelines and tables are made of the same materials as the world: dark alloy plates, ice-blue evidence lines, monospace labels. They anchor to the selected object and never replace the world. Dense data is welcome; generic cards, glass panels and statistic rows as the primary experience are not.

## 10. Prohibited generic treatments

Glassmorphism dashboards; rows of rectangular statistic cards as the primary experience; cartoon astronauts; primitive spheres presented as a final visual language; interchangeable coloured avatars; constant uncontrolled movement; bloom that destroys detail; particle noise over paths or selectable objects; colour as the only state indicator; a 3D backdrop with all real work in text boxes; a folder browser disguised as the Mind; a bare node graph without environmental meaning; gold on anything not owner-authorised; any object that implies a model's private thoughts.

## 11. Quality bar and checkpoint

The Phase 0 spikes prove the stack and the signature look; the Phase 1 slice must meet the bar in section 5.5 of the commission. Software rendering in a container cannot judge bloom, colour or motion quality; the owner art-direction checkpoint (`docs/process/ART_DIRECTION_CHECKPOINT.md`) is where the bar is judged on a real GPU.
