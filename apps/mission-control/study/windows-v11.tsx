import { createRoot } from 'react-dom/client';
import '../src/ui/app.css';
import { publishDemoState } from '../src/world/panel/panelStore.js';
import { demoAt } from '../src/world/room/demo.js';
import { AgentWindow } from '../src/world/window/AgentWindow.jsx';
import type { Agent } from '../src/world/window/windowContent.js';
import '../src/world/mobile/mobile.css';

/**
 * **The window study: one agent window, at phone size, in a browser, in
 * seconds.**
 *
 * Stage 3's windows are DOM, so the only sane way to do *render → look →
 * refine → look* on them is a page that reloads in a second rather than a
 * forty-minute owner build. This is the same idiom stage 2 used for the
 * in-world screens (`study/screens-v11.html`) and it is committed for the same
 * reason: V10 recorded what throwing V9's measuring script away cost — when the
 * owner asked a follow-up question it could not be reproduced and a defect was
 * left unfixed.
 *
 * It renders the **same component the world renders**, with the same
 * stylesheet, against the demonstration's own state at a chosen second. It is
 * not a mock of the window; it is the window, with the 3D world absent.
 *
 * Query parameters:
 *   `agent`  virgil | fabricator | prover | keeper
 *   `t`      the demonstration second
 *   `loop`   0 PASS, 1 BLOCKED, 2 INSUFFICIENT_EVIDENCE
 *   `open`   `1` expands every section
 *   `inset`  a simulated safe-area inset in px, for the Dynamic Island
 *   `land`   `1` puts the stage in its landscape layout
 */

const query = new URLSearchParams(window.location.search);
const agent = (query.get('agent') ?? 'virgil') as Agent;
const t = Number.parseFloat(query.get('t') ?? '26');
const loop = Number.parseInt(query.get('loop') ?? '0', 10);
const inset = Number.parseInt(query.get('inset') ?? '0', 10);
const landscape = query.get('land') === '1';

publishDemoState(demoAt(t, loop, true));

const root = document.getElementById('study') as HTMLElement;
root.className = 'v11-stage is-focused';
root.dataset.orientation = landscape ? 'landscape' : 'portrait';
if (inset > 0) {
  root.style.setProperty('--v11-safe-top', `${inset}px`);
  root.style.setProperty('--v11-safe-bottom', `${Math.round(inset * 0.58)}px`);
}

createRoot(root).render(
  <AgentWindow
    target={{ agent }}
    origin={{ x: 195, y: 520 }}
    onClose={() => undefined}
    onGo={() => undefined}
  />,
);

/**
 * `?tall=1` lets the whole document be photographed at once. The window is a
 * fixed-height sheet with its own scroller, so a full-page screenshot of it
 * shows only the first viewport; this releases the height **in the study page
 * alone** — no product rule is changed, and every measurement is taken in the
 * un-released layout.
 */
if (query.get('tall') === '1') {
  const style = document.createElement('style');
  style.textContent = `
    html, body, #study { height: auto !important; overflow: visible !important; }
    #study.v11-stage { position: static !important; height: auto !important; }
    .v11w-root { position: static !important; }
    .v11w-sheet { height: auto !important; }
    .v11w-body { overflow: visible !important; max-height: none !important; }
  `;
  document.head.append(style);
}

// Expanding every section is how the study looks at the evidence level; the
// world's own default is collapsed, which the frames also show.
if (query.get('open') === '1') {
  let tries = 0;
  const expand = () => {
    const all = document.querySelectorAll<HTMLButtonElement>('.v11w-disclose');
    tries += 1;
    if (all.length === 0) {
      if (tries < 60) requestAnimationFrame(expand);
      return;
    }
    // **Clicked once, and once only.** The first version polled and clicked on
    // every frame; React 19 commits asynchronously, so the second pass still
    // saw `aria-expanded="false"` and clicked every section shut again. Every
    // "expanded" frame in that pass showed only the sections that open by
    // default — the measurement was right and the picture was a lie, which is
    // the worse way round.
    for (const button of Array.from(all)) {
      if (button.getAttribute('aria-expanded') === 'false') button.click();
    }
  };
  requestAnimationFrame(expand);
}
