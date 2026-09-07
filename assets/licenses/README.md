# Licences and provenance

`ASSET_PROVENANCE.md` is the maintained register: one row per imported file with origin, licence, verification status and category. The owner's bundle records are preserved verbatim under `docs/art-direction/approved/bundle/`.

Rule: nothing enters `assets/` or `docs/art-direction/approved/` without a row here, written before the file is committed. If a licence cannot be verified from its primary source, the file waits.

One narrow exception, deliberate and named so the two files do not contradict each other: for Meshy-generated models only, `docs/decisions/OD-0008-meshy-licence-attestation.md` overrides the waiting rule above — an owner decision is authority layer 1 and this README is layer 4 in the authority order in `CLAUDE.md` — and accepts the owner's own attestation as the licence basis, with the register's verification column reading "owner attestation, not verified". The requirement for a row written before the file is committed is unchanged, no other source is covered, and nobody has read Meshy's terms.
