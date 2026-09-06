import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Link, Route, Routes } from 'react-router';
import { CharactersSpike } from './spikes/characters/CharactersSpike.js';
import { FoundrySpike } from './spikes/foundry/FoundrySpike.js';
import { MindSpike } from './spikes/mind/MindSpike.js';

function Index() {
  return (
    <main style={{ padding: 32, font: '14px/1.6 var(--mono)', maxWidth: 720 }}>
      <h1
        style={{
          font: '600 16px var(--mono)',
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          color: 'var(--ice)',
        }}
      >
        Virgil Mission Control — Phase 0.5 prototype
      </h1>
      <p>
        Bounded visual recovery under OD-0002: one hero Foundry bay, four screen-faced astro-bots,
        one Mind cluster. Not the product interface. Every work animation is driven by a recorded
        fixture event and gated by the Operational Animation Grammar; idle life is ambient only.
      </p>
      <ul>
        <li>
          <Link to="/spike/foundry" style={{ color: 'var(--cyan)' }}>
            Orbital Foundry · success run
          </Link>{' '}
          — file edit, unstaged modules, staging, commit sealing, push, handoff, verification,
          independent Keeper review, non-blocking finding, review pass, safe-to-merge outside the
          closed airlock, refused tampered push.{' '}
          <Link to="/spike/foundry?run=failed" style={{ color: 'var(--coral)' }}>
            failed-check run
          </Link>{' '}
          — unit check fails, verification completes with a failure, quarantine.
        </li>
        <li>
          <Link to="/spike/mind" style={{ color: 'var(--cyan)' }}>
            Mind of Virgil · knowledge cluster
          </Link>{' '}
          — source arrival through the gateway, hashing, non-destructive reading, compilation
          proposal, provenance tether, contested claim, durable node, Mind Scan finding.
        </li>
        <li>
          <Link to="/spike/characters" style={{ color: 'var(--cyan)' }}>
            Character family line-up
          </Link>{' '}
          — Fabricator, Prover, Keeper, Virgil in every mode; add <code>?mono=1</code> for the
          greyscale silhouette test.
        </li>
      </ul>
      <p style={{ color: 'var(--ash)' }}>
        Query parameters: step, run (failed), tier (ultra|desktop|laptop|mobile|constrained),
        reduced (1), hold (1 to suppress camera travel), mono (1). Keyboard: ← → steps, Home/End.
      </p>
    </main>
  );
}

createRoot(document.getElementById('root') as HTMLElement).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Index />} />
        <Route path="/spike/foundry" element={<FoundrySpike />} />
        <Route path="/spike/mind" element={<MindSpike />} />
        <Route path="/spike/characters" element={<CharactersSpike />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>,
);
