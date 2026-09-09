import { StrictMode, useEffect, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import { HashRouter, Link, Route, Routes, useNavigate } from 'react-router';
import { FoundrySpike } from '../spikes/foundry/FoundrySpike.js';
import { MindSpike } from '../spikes/mind/MindSpike.js';
import { MobileRoom } from '../world/mobile/MobileRoom.js';
import { VirgilRoom } from '../world/room/VirgilRoom.js';
import '../ui/app.css';
import './owner.css';
import './owner-v11.css';

/**
 * **The V11 Owner Build entry point.** Additive: `main-owner.tsx` is untouched
 * and still builds V10 from its own commit, byte for byte
 * (`docs/process/V11_BRIEF.md`, "The preservation contract").
 *
 * The routes, and why each exists:
 *
 *  - `#/` — **V11**, the phone-first composition. What the file opens on.
 *  - `#/v10` — **V10, unchanged**, rendered by the same `VirgilRoom` component
 *    V10 ships and carrying its own provenance footer, so the owner can compare
 *    the two and go back without a second download. The brief asks for exactly
 *    this. Nothing on this route is styled by `owner-v11.css`, which touches
 *    only `.v11-*` and `.owner-v11-*` selectors.
 *  - `#/s1`, `#/spike/foundry`, `#/spike/mind` — the rejected Phase 0 spikes,
 *    reachable so that viewing point V0 stays reproducible, as in V10.
 *
 * The footer below is a copy of V10's, not an import: `main-owner.tsx` does not
 * export it and may not be edited to. It renders **only on the routes that had
 * one**. V11's own route puts the same information behind the development menu
 * and leaves a discreet version marker in the open (`MobileRoom.tsx`,
 * `TalkBar`).
 */

declare const __OWNER_BUILD_SHA__: string;
declare const __OWNER_BUILD_SHORT_SHA__: string;
declare const __OWNER_BUILD_DATE__: string;
declare const __OWNER_BUILD_STAGE__: string;

/** As V10: turns root-relative anchor clicks into hash navigation. */
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

/**
 * V10's provenance footer, markup for markup, so the `#/v10` route reserves the
 * same strip and reads the same. It publishes its height as the same CSS
 * variable the V10 stage and the panel read.
 */
function OwnerFooter() {
  const footer = useRef<HTMLElement>(null);
  useEffect(() => {
    const element = footer.current;
    if (!element || typeof ResizeObserver === 'undefined') return;
    const publish = () => {
      document.documentElement.style.setProperty(
        '--owner-footer-height',
        `${Math.ceil(element.getBoundingClientRect().height)}px`,
      );
    };
    publish();
    const observer = new ResizeObserver(publish);
    observer.observe(element);
    return () => {
      observer.disconnect();
      document.documentElement.style.removeProperty('--owner-footer-height');
    };
  }, []);
  return (
    <footer className="owner-footer" ref={footer}>
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

/** The V10 comparison route: V10's own component, with V10's own footer under it. */
function V10Route() {
  return (
    <>
      <VirgilRoom />
      <OwnerFooter />
    </>
  );
}

function Index() {
  return (
    <>
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
            V11 — the phone-first world
          </Link>{' '}
          is the page this file opens on.{' '}
          <Link to="/v10" style={{ color: 'var(--ice)' }}>
            V10, unchanged
          </Link>{' '}
          is in this same file so the two can be compared without a second download.
        </p>
        <p style={{ color: 'var(--amber)' }}>
          Below are the <b>rejected Phase 0 spikes</b>, kept only so that viewing point V0 remains
          reproducible. They are not the art direction you approved and are not offered for
          judgement.
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
      <OwnerFooter />
    </>
  );
}

function SpikeRoute({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <OwnerFooter />
    </>
  );
}

createRoot(document.getElementById('root') as HTMLElement).render(
  <StrictMode>
    <HashRouter>
      <RootRelativeLinks />
      <Routes>
        <Route
          path="/"
          element={
            <MobileRoom
              build={{
                sha: __OWNER_BUILD_SHA__,
                shortSha: __OWNER_BUILD_SHORT_SHA__,
                date: __OWNER_BUILD_DATE__,
                stage: __OWNER_BUILD_STAGE__,
              }}
            />
          }
        />
        <Route path="/v10" element={<V10Route />} />
        <Route path="/s1" element={<Index />} />
        <Route
          path="/spike/foundry"
          element={
            <SpikeRoute>
              <FoundrySpike />
            </SpikeRoute>
          }
        />
        <Route
          path="/spike/mind"
          element={
            <SpikeRoute>
              <MindSpike />
            </SpikeRoute>
          }
        />
      </Routes>
    </HashRouter>
  </StrictMode>,
);
