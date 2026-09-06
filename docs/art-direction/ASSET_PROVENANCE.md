# Asset provenance register

Every external source studied or reused for the rendered worlds, with licence, verification and modifications. Governed by OD-0002 (Bot Crossing research rules). An asset whose licence could not be verified from a primary source is not imported.

## External sources studied (read-only)

| Source | Creator | Version studied | URL | Licence | Verified | Use |
|---|---|---|---|---|---|---|
| Bot Crossing | Jarren Rocks | commit `87ec8373ca92e5a3d0d7cde252130a0c76644869` (2026-09-03, "Run on Windows too") | https://github.com/jarrenrocks/bot-crossing | MIT (repository `LICENSE`, © 2026 Jarren Rocks) | 2026-09-06, from the repository's own `LICENSE` file in a shallow read-only clone outside this repository | Study only: proportions, worn-part attachment, screen-face atlas technique, state-to-clip precedence, badge and name-plate discipline, camera and lighting notes. No code copied. No faces, characters, buildings or world copied. |
| KayKit Character Animations (mannequin body and clips bundled by Bot Crossing as `crew.glb`) | Kay Lousberg | 1.1 (per Bot Crossing's `tools/build-crew.mjs`) | https://kaylousberg.itch.io/kaykit-character-animations | Stated CC0 1.0 by Bot Crossing's `public/assets/CREDITS.md` | NOT VERIFIED: the session's egress policy refused `kaylousberg.itch.io`, `kaylousberg.com` and the KayKit GitHub organisation (HTTP 403 on CONNECT; GitHub API scoped to configured repositories) on 2026-09-06 | Not imported. OD-0002: a blocked verification means no import. |
| KayKit Space Base Bits, KayKit Forest Nature Pack | Kay Lousberg | 1.0 FREE | https://kaylousberg.itch.io/space-base-bits, https://kaylousberg.itch.io/kaykit-forest | Stated CC0 1.0 by Bot Crossing's `CREDITS.md` | NOT VERIFIED (same policy refusal) | Not imported. |

## What Phase 0.5 ships

All characters, equipment, stations, screens, materials and shaders in `apps/mission-control/src/world` and `apps/mission-control/src/characters` are original procedural geometry and code authored in this repository. The rig is an original procedural robot rig (`characters/rig.ts`) with procedural locomotion, work, wait and refusal poses; no skinned mesh or animation clip from any external pack is used. The screen-expression atlas (`characters/faces.ts`) is drawn from this repository's own glyph designs; it uses the same general technique Bot Crossing documents (a white-on-black mask atlas coloured per instance at draw time), which is a rendering technique, not a copied asset.

Attribution: the technique study of Bot Crossing (MIT) is acknowledged here and in OD-0002. No MIT-licensed code was copied, so no MIT notice is reproduced in source files.

## Rule for future imports

Before any external model, animation, texture or font is added: record name, creator, version, source URL, licence text location, verification date and method, and every modification, in this table; commit the verification alongside the asset. If the primary source cannot be reached from the session, the asset waits.
