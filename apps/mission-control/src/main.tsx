import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Link, Route, Routes } from 'react-router';
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
        Virgil Mission Control — Phase 0 spikes
      </h1>
      <p>
        Art-direction and data-contract proofs. Not the product interface. Every animation is driven
        by a recorded fixture event and gated by the Operational Animation Grammar.
      </p>
      <ul>
        <li>
          <Link to="/spike/foundry" style={{ color: 'var(--cyan)' }}>
            Orbital Foundry spike
          </Link>{' '}
          — read, search, edit, unstaged, staging cradle, sealed SHA commit, push transit, remote
          confirmation, evidence-backed handoff.
        </li>
        <li>
          <Link to="/spike/mind" style={{ color: 'var(--cyan)' }}>
            Mind of Virgil spike
          </Link>{' '}
          — source arrival, hashing, non-destructive reading, compilation proposal, provenance
          tether, durable node, contested claim, Mind Scan finding.
        </li>
      </ul>
      <p style={{ color: 'var(--ash)' }}>
        Query parameters: step, tier (ultra|desktop|laptop|mobile|constrained), reduced (1), hold (1
        to suppress camera travel). Keyboard: ← → steps, Home/End.
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
      </Routes>
    </BrowserRouter>
  </StrictMode>,
);
