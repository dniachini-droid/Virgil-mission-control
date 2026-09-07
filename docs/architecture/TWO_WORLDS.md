# Two worlds: navigation and causal connection

Deliverable 12. Source: master commission sections 5.1, 5.2, 5.6 and 7.6; Amendment 1 sections K to O. Data: `packages/visual-language`. Related: `KNOWLEDGE_ONTOLOGY.md`, `EVENT_MODEL.md`, `docs/art-direction/ART_BIBLE.md`.

## Distinct purposes

| | Orbital Foundry | The Mind of Virgil |
|---|---|---|
| Truth | Operational: repositories, agents, worktrees, artifacts, handoffs, verification, review, quarantine, gates, deployment | Epistemic: sources, compilation, durable knowledge, provenance, contradiction, uncertainty, supersession, knowledge health |
| Source of state | Read model (`@virgil/domain`) folded from operational events; live signals from adapters | Provenance graph (`@virgil/knowledge-graph`) derived from files, plus knowledge events |
| Objects | Observatory, project stations, docking bays, workers, work orders, capsules, corridors, scanner arrays, inspection stations, quarantine fields, repair docks, owner airlock, launch gate | Archive Nebula (sealed sources), Synaptic Forge (proposals, tethers, interference), Living Knowledge Galaxy (structures by kind, monuments, anomalies, historical orbit), scan beacons |
| Time | Now, with timeline replay of a run | Compiled and verified dates, supersession history, scan history |
| What it never is | A dashboard with a decorative canvas | A folder browser, a documentation sidebar or a bare node graph |

Shared art direction: one palette, one material system, one label grammar, one camera grammar, one motion discipline. The Mind is darker and stiller; the Foundry is brighter and more kinetic. Gold means the owner in both.

## Spatial layout and navigation

The Foundry is a ring of stations around the central observatory. The Mind gateway is a luminous threshold on the ring's outer edge, opposite the launch gate. Travelling through the gateway is a continuous camera move along a real lane; the Foundry recedes behind and the Archive Nebula opens ahead. There is no cut to black. Return follows the same lane. Both worlds share one scene graph with two regions and one camera; the projection layer decides which region's objects are resident and which are distant silhouettes.

Views (commission 5.6): Living World (spatial), Evidence View (anchored to the selected object, same materials, never replaces the world), Timeline Replay (scrub, step, pause, jump to event, jump to evidence, from `replayFrames`), Mind View (enter the three regions, trace a node to sources, inspect contradiction and supersession, start a read-only Mind Scan, read exact wiki content in place).

Routes: `/foundry`, `/foundry/station/:projectId`, `/foundry/artifact/:sha`, `/replay/:runId/:seq`, `/mind`, `/mind/source/:sourceId`, `/mind/node/:nodeId`, `/mind/scan/:scanId`. Phase 0 provides `/spike/foundry` and `/spike/mind` only.

Selection: pointer and keyboard (Tab cycles selectable objects in reading order of the current view, Enter opens Evidence View, Escape returns, arrow keys move between related objects along tethers or corridors). Every selectable object has an accessible name equal to its label.

## Causal connection

Nothing crosses between worlds without a typed event, and no crossing changes authority semantics.

Foundry → Mind:
1. `safe_to_merge` and `merged_by_owner` complete a run; its run record is written.
2. `run_record_deposited` (knowledge stream) carries the run record as evidence to the gateway. A sealed run artifact appears at the threshold. It is evidence, not knowledge.
3. `raw_source_added` and `raw_source_hashed` create and seal a raw source record for the run.
4. `raw_source_read` opens a non-destructive projection.
5. `knowledge_compilation_proposed` produces translucent fragments in the Forge with tethers to the run record and to any other sources.
6. `claim_supported`, `provenance_tether_created`, `claim_contested` classify the fragments; contradictions form interference and stay.
7. `knowledge_compilation_approved` by verification, or by an owner decision when the affected pages are owner-controlled.
8. `wiki_page_created` or `wiki_page_updated` assembles the durable structure only now.

Mind → Foundry:
- A project manifest lists `governingKnowledgeNodes`; the project station shows those principles, decisions and architecture nodes as governing marks, resolved from the graph.
- Selecting a Foundry finding whose `criterionId` or authority reference resolves to a knowledge node travels along the gateway lane to that node.
- Selecting a durable rule reveals every project surface governed by it: reverse tethers from wiki nodes to code paths and to project manifests.

Rules: a wiki compilation event cannot manufacture a repository fact; an agent completion event cannot create verified durable knowledge; a worker report becomes knowledge only through the sequence above with provenance, verification state and any required approval intact.

## Live signals inside the Mind

When a Mind node is selected, any live operational values shown beside it (for example the current state of a candidate that a lesson concerns) are rendered as `live_operational_signal` packets pointing at the read model, never as part of the node. They disappear when the signal ends. The wiki text never contains them.

## Phase 0 proof and Phase 1 scope

Phase 0 spikes render one fixture-driven Foundry sequence and one Mind sequence in two routes with a shared visual system. Phase 1 builds the gateway crossing as one continuous camera move on one scene graph with mock events for the full story (`docs/process/PHASE_1_BRIEF.md`).
