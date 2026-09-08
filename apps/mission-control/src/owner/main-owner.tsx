import { StrictMode, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { HashRouter, Link, Route, Routes, useNavigate } from 'react-router';
import { FoundrySpike } from '../spikes/foundry/FoundrySpike.js';
import { MindSpike } from '../spikes/mind/MindSpike.js';
import { VirgilRoom } from '../world/room/VirgilRoom.js';
import '../ui/app.css';
import './owner.css';

/**
 * The Owner Build entry point.
 *
 * Stage S1 made the application openable from a `file://` URL. This stage puts
 * Virgil in his room behind it: the default route is `VirgilRoom`, the first
 * art-directed viewing point. The owner-rejected Phase 0 spikes stay reachable
 * under `#/s1`, unaltered — nothing in `src/spikes/` is touched from here.
 *
 * Three differences from `src/main.tsx`, all forced by `file://` and none of them
 * visual:
 *  - `HashRouter`, because a `file://` document has no server to resolve
 *    `/spike/foundry` against; `BrowserRouter` would give the owner a blank page.
 *  - a click interceptor, because `src/ui/Hud.tsx` links between the two spikes
 *    with a plain root-relative anchor that would otherwise walk the filesystem.
 *  - the provenance footer below, which names the commit the file was built from.
 */

declare const __OWNER_BUILD_SHA__: string;
declare const __OWNER_BUILD_DATE__: string;
declare const __OWNER_BUILD_STAGE__: string;

/**
 * Turns root-relative anchor clicks into hash navigation. Without this the
 * "Mind of Virgil →" link in the spike HUD leaves the page for a path that does
 * not exist on the owner's disk.
 */
function RootRelativeLinks() {
  const navigate = useNavigate();
  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const anchor = (event.target as Element | null)?.closest?.('a');
      const href = anchor?.getAttribute('href');
      if (!href || !href.startsWith('/')) return;
      event.preventDefault();
      navigate(href);
    };
    document.addEventListener('click', onClick);
    return () => document.removeEventListener('click', onClick);
  }, [navigate]);
  return null;
}

function OwnerFooter() {
  return (
    <footer className="owner-footer">
      <span>
        <b>Virgil Owner Build</b> — {__OWNER_BUILD_STAGE__}
      </span>
      <span>
        built from commit <code>{__OWNER_BUILD_SHA__}</code>
      </span>
      <span>
        built <code>{__OWNER_BUILD_DATE__}</code>
      </span>
      <span className="owner-footer-note">
        Performance on this machine is not a measurement and is not recorded as one. The two
        graphics-hardware checks in OD-0005 are deferred and recorded as not performed, never as
        met.
      </span>
    </footer>
  );
}

function Index() {
  return (
    <main
      className="owner-index"
      style={{ padding: 32, font: '14px/1.6 var(--mono)', maxWidth: 760 }}
    >
      <h1
        style={{
          font: '600 16px var(--mono)',
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          color: 'var(--ice)',
        }}
      >
        Virgil Owner Build — {__OWNER_BUILD_STAGE__}
      </h1>
      <p>
        <Link to="/" style={{ color: 'var(--gold)' }}>
          Virgil in his room
        </Link>{' '}
        is the page this file opens on. This page keeps the earlier material reachable.
      </p>
      <p style={{ color: 'var(--amber)' }}>
        Below are the <b>rejected Phase 0 spikes</b>, kept only so that viewing point V0 remains
        reproducible. They are not the art direction you approved and are not offered for judgement.
      </p>
      <ul>
        <li>
          <Link to="/spike/foundry" style={{ color: 'var(--cyan)' }}>
            Orbital Foundry spike
          </Link>
        </li>
        <li>
          <Link to="/spike/mind" style={{ color: 'var(--cyan)' }}>
            Mind of Virgil spike
          </Link>
        </li>
      </ul>
      <p style={{ color: 'var(--ash)' }}>
        This file contains no network requests and needs no internet connection once downloaded.
      </p>
    </main>
  );
}

createRoot(document.getElementById('root') as HTMLElement).render(
  <StrictMode>
    <HashRouter>
      <RootRelativeLinks />
      <Routes>
        <Route path="/" element={<VirgilRoom />} />
        <Route path="/s1" element={<Index />} />
        <Route path="/spike/foundry" element={<FoundrySpike />} />
        <Route path="/spike/mind" element={<MindSpike />} />
      </Routes>
      <OwnerFooter />
    </HashRouter>
  </StrictMode>,
);
