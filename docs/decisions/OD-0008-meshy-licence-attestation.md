# OD-0008 — The owner's attestation as the licence basis for Meshy-generated models (Tier 3)

Status: **Accepted.** Issued by the owner in the owner console on 2026-09-07. The owner's words are the source and are quoted verbatim below; this file transcribes them and decides nothing itself. It is filed here by a session on the owner's instruction, under the mechanism recorded in `OD-0006-recording-owner-decisions.md`. It carries authority (layer 1) from the owner's acceptance, not from this transcription.

What this record is worth is exactly what OD-0006 says it is worth, and no more. The quotation below was written down by the same session that filed this file. Nothing in this repository holds an independent copy of what the owner said, so no reader can check it against anything. **The owner reading this file is the only way a false one is found.**

## Question

`assets/licenses/README.md` states the rule: "If a licence cannot be verified from its primary source, the file waits."

The owner is generating Virgil character models with a paid Meshy subscription. Asked for the licence that governs Meshy's output, the owner reported that the Meshy asset page shows only a visibility setting reading "private", and did not retrieve the Terms of Service text. A visibility setting is not a licence. It governs whether other Meshy users can browse the asset on Meshy; it says nothing about what rights the owner holds in the file they download, and nothing about commercial use.

No session in this repository can retrieve the terms either. `.claude/settings.json` denies `WebFetch` and `WebSearch`, deliberately. So the primary source is unreachable from inside a session, and the owner has not read it from outside one.

Without a licence basis of some kind, no Meshy model may enter `assets/` at all, because the register rule in `assets/licenses/README.md` requires a row written before the file is committed and the row has nothing to record.

The identical gap already stands unresolved one file away. `assets/models/candidates/virgil-model-candidate-01.glb` is recorded in `assets/licenses/ASSET_PROVENANCE.md` with its TripoSR licence marked **"Stated, not verified"**, for the same reason: the consolidation session could not read the TripoSR licence from its primary source. That row has not been repaired and this record does not repair it.

## Decision

The owner's own attestation is accepted as the licence basis for Meshy-generated models in this project.

The owner's words, which are the authority for this record, quoted verbatim:

> "I hold a paid Meshy subscription and I accept that I have the commercial rights to use models I generate with it in this project. 7 September 2026."

## Conditions

- **It covers Meshy output only.** It is not a general rule that an owner attestation substitutes for a licence.
- **It does not extend to TripoSR, KayKit, Bot Crossing or any other third-party source.** Each of those still requires its own licence basis, recorded and verified on its own terms. The TripoSR row in `assets/licenses/ASSET_PROVENANCE.md` stays as it is, at "Stated, not verified". The KayKit and Bot Crossing entries under "Sources studied, not imported" are unchanged.
- **Every Meshy file entering the repository still requires a provenance row, written before the file is committed.** The register rule in `assets/licenses/README.md` is not relaxed. The row must record the origin (Meshy), the generation prompt used, the generation date, and this record as the licence basis.
- **The verification column for such a row reads "owner attestation, not verified".** It does not read "verified", and it does not read "stated" — the register's existing vocabulary has no term for this, so the phrase is written out in full. A session that writes "verified" against a Meshy row has broken this record.

## Cost

Stated plainly, and not softened.

**This is not verification, and it must not be read as any.** Nobody has read Meshy's terms. Not the owner, not any session, not any reviewer. The register will say so in the verification column of every affected row, in those words, so that no later reader can mistake the position.

**An attestation records who decided; it does not create rights the owner may not hold.** If Meshy's terms reserve rights in generated output, or restrict commercial use, or condition the owner's rights on an active subscription — so that the rights lapse if the subscription lapses — this record does not change any of that and does not protect the project. It fixes responsibility for having proceeded without checking. That is the whole of its effect. It is a record of a decision, not a grant of a licence, and the party who would need to grant a licence is not a party to it.

**It is self-attesting in exactly the sense OD-0006 sets out at length.** The quotation and the record have one source, not two. The same session that files this record transcribed the words into it. Nothing in this repository holds an independent copy of the owner's instruction: the owner console transcript is not committed here, not hashed here, and not referenced from any file here. A later reader has nothing to check the quotation against; reading it is reading one session's assertion a second time. The owner reading their own decision record is the whole of the detection that exists. That is not a defence and is not recorded as one.

**One thing is specifically worse here than for the earlier candidate, and it is worth naming.** `assets/models/candidates/virgil-model-candidate-01.glb` was generated from the owner's own reference artwork — the approved Virgil three-quarter reference, which the owner supplied and which carries no third-party licence. That derivation was an independent partial argument for the owner's rights in the output, standing on its own regardless of what the TripoSR licence said. The Meshy model under discussion was generated **from a text prompt**. There is no owner-supplied input artwork in it. So that argument does not apply to it at all, and the licence position — which is to say, this attestation and nothing else — carries correspondingly more of the weight.

**Classification**, in the status vocabulary of `docs/architecture/ENFORCEMENT_BOUNDARIES.md`: **design-level only**. Nothing in code checks that the owner holds the rights they attest to, and nothing can. There is no test, schema, deny rule, reducer check or gate that stands between a Meshy file with an attestation row and the repository. The register row is a document; the rule that the row must exist is a procedure a session is asked to follow.

## How this is discharged

**This record is not permanent by default.** It stands in for a licence text that has not been read, and it retires the moment that text is read. The exact steps that retire it:

1. Paste the ownership section of Meshy's Terms of Service — the part that states what rights the subscriber holds in generated output — into `assets/licenses/MESHY-TERMS.txt`, with the date it was read recorded in that file.
2. Update the verification column of the affected rows in `assets/licenses/ASSET_PROVENANCE.md` from "owner attestation, not verified" to verified, citing `assets/licenses/MESHY-TERMS.txt` and the date.

Any session may do both steps once the text exists in the repository. It needs no further owner decision, because reading a licence and recording what it says is not a decision. What a session may **not** do is write "verified" without that file present.

If the text, once read, turns out to contradict the owner's attestation, that is an owner matter and a session reports it rather than resolving it.

## Consequences

- **The "the file waits" rule in `assets/licenses/README.md` is overridden for Meshy output by this record.** That is layer 1 over layer 4 in the authority order in `CLAUDE.md`, and it is the only route by which a Meshy file can enter `assets/` at all.
- **The override is deliberate and narrow.** It reaches Meshy output and nothing else. It does not touch the requirement that a row be written before the file is committed, and it does not touch any other source. Every other file still waits when its licence cannot be verified.
- **The override is named in both documents rather than left implicit.** `CLAUDE.md` says a session that finds a contradiction reports it and does not resolve it silently. A record that quietly contradicted `assets/licenses/README.md` would leave the next session to discover the conflict and guess which document governed. So `assets/licenses/README.md` carries a sentence pointing at this record, and this record names the file it overrides. The authority order decides which wins; the cross-reference makes sure a reader does not have to work out that there was a fight.
- **`assets/licenses/ASSET_PROVENANCE.md` carries a Meshy section from the filing of this record**, pre-stating the licence basis and the verification status before any file arrives, as `assets/licenses/README.md` requires. No Meshy file has been imported yet. The fields that depend on the file itself — repository path, SHA-256, face and vertex counts, the generation prompt, the generation date, the animation clips present — are named there as outstanding and must be filled in when the file arrives.
- **No Meshy file is admitted by this record on its own.** It supplies the licence basis. The row, the file, and the rest of the register rule are still required.
- Nothing here is ratified by its transcription.

Applies to: `assets/licenses/ASSET_PROVENANCE.md`, `assets/licenses/README.md`, `assets/models/`, and any future `assets/licenses/MESHY-TERMS.txt`.

Decided at: 2026-09-07 (the owner's instruction in the owner console). Transcribed and filed on the same date.
