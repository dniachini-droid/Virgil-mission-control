# ADR-0002 — Application framework: Vite, React 19, React Router

Status: Accepted. Date: 2026-09-06. Deciders: owner (via OD-0001 dependency authority); authored by the Phase 0 session.

## Context
The commission asks for React with a production-capable framework. The application is a client-rendered real-time 3D world; nothing in Phases 0 to 3 needs server rendering.

## Decision
Vite 8.2.2 with @vitejs/plugin-react 6.1.1, React 19.2.8, react-router 7.18.3 in library mode. Routes are client-side; the orchestration API arrives as a separate app in Phase 3.

## Alternatives
Next 16.3: server components and the `use client` boundary add friction for a scene-graph app and provide no Phase 0 or 1 benefit. React Router 8 pre-release: not stable.

## Consequences
Single bundle today (1.6 MB minified, 427 KB gzip); code splitting by world is a Phase 1 task. Static hosting suffices until Phase 3.

## Licences
vite MIT, @vitejs/plugin-react MIT, react MIT, react-dom MIT, react-router MIT, @types/react MIT.

## Revisit
If Phase 3 needs server-side sessions in the same app, evaluate React Router framework mode before Next.
