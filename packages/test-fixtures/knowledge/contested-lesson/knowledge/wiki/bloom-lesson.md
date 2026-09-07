---
nodeId: bloom-lesson
kind: lesson
title: bloom-lesson
epistemicClass: durable_compiled_knowledge
authorityClass: compiled
status: contested
compiledAt: 2026-09-06T00:00:00+00:00
compiledBy: fixture
sources:
  - { kind: raw_source, ref: src-run }
  - { kind: raw_source, ref: src-note }
contradicts: [C-bloom-note]
claims:
  - id: C-bloom-run
    statement: Bloom intensity 0.6 keeps labels legible.
    sources: [src-run]
    contradicts: [C-bloom-note]
  - id: C-bloom-note
    statement: Bloom above 0.4 destroys label legibility.
    sources: [src-note]
    contradicts: [C-bloom-run]
---

Two supported claims disagree; both stay visible.
