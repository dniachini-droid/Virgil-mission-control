import { OrbitControls } from '@react-three/drei';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import {
  Bloom,
  BrightnessContrast,
  EffectComposer,
  HueSaturation,
  Noise,
  Vignette,
} from '@react-three/postprocessing';
import { type ComponentRef, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import {
  detectTier,
  prefersReducedMotion,
  SettingsContext,
  useSettings,
} from '../../ui/settings.js';
import { Figure } from '../characters/Figure.js';
import { VirgilRigged } from '../characters/VirgilRigged.js';
import type { FaceState } from '../characters/Visor.js';
import type { SlabName } from '../panel/panelContent.js';
import { demoSnapshot, publishDemoState } from '../panel/panelStore.js';
import { RUN, RUN_SECONDS, recordedClock, recordedDuration } from '../replay/recordedRun.js';
import {
  compressionOf,
  DEFAULT_SPEED,
  PLAYBACK_SECONDS,
  REPLAY_SPEEDS,
  type ReplaySpeed,
  speedLabel,
} from '../replay/replayTimeline.js';
import { useReplay } from '../replay/useReplay.js';
import { CAST, ROLES, type Role } from '../room/cast.js';
import { demoAt, demoStart, forcedState, type RunMode, useDemo } from '../room/demo.js';
import { FloorSheen } from '../room/FloorSheen.js';
import { reportCamera, wasTap, watchGestures } from '../room/gesture.js';
import { LightingRig } from '../room/LightingRig.js';
import { PortholeFrame, Station, StationLight, VirgilConsole } from '../room/Models.js';
import { Orrery } from '../room/Orrery.js';
import { type CameraPose, room } from '../room/palette.js';
import { RoomShell } from '../room/RoomShell.js';
import { Tabletop } from '../room/Tabletop.js';
import { WindowView } from '../room/WindowView.js';
import { setBandOnTwoLines, setBandReplay } from '../screens/draw.js';
import { ConsoleScreenV11 } from '../screens/v11/ConsoleScreenV11.js';
import { contentFor } from '../screens/v11/recorded.js';
import { ScreenBankV11 } from '../screens/v11/ScreenBankV11.js';
import { AgentWindow, type WindowOrigin } from '../window/AgentWindow.jsx';
import { type Agent, type WindowTarget, windowForLedgerRow } from '../window/windowContent.js';
import {
  type Anchor,
  backdropFor,
  anchors as buildAnchors,
  type MobileFocus,
  mobilePose,
  orientationFor,
} from './composition.js';
import {
  FRAME_BUDGET_MS,
  type GovernorState,
  LEVEL_PLANS,
  LEVELS,
  type Level,
  loopFor,
  newGovernor,
  observeFrame,
  setSceneLoad,
  tierAfter,
} from './performance.js';
import { ceilingFor, dprFor, SHARPNESS, type Sharpness } from './pixelRatio.js';
import { type Insets, NO_INSETS, readInsets } from './safeArea.js';
import { projections, setPressed, TouchProjector, TouchTargets, targetAt } from './TouchTargets.js';
import './mobile.css';

/**
 * **V11, stage 1: the world composed for a phone.**
 *
 * A deliberate sibling of `world/room/VirgilRoom.tsx` rather than a rewrite of
 * it. V10 must stay openable and unchanged so the owner can compare and go
 * back (`docs/process/V11_BRIEF.md`, "The preservation contract"), and the
 * cheapest way to guarantee that is for V10's component to keep every line it
 * had. So this file duplicates V10's scene assembly — the same `Cast`, the same
 * post chain, the same rig — and changes only what stage 1 is about:
 *
 *  1. **the camera is authored for the viewport** (`composition.ts`), portrait
 *     first and landscape as an intentional secondary, not the desktop camera
 *     widened until the sides fall off;
 *  2. **the interface is reachable with a thumb**: every character and every
 *     important screen carries a 48 px target (`TouchTargets.tsx`), a tap flies
 *     the camera there *and then* opens the record, and there is one obvious
 *     way back;
 *  3. **the development chrome is out of the ordinary experience** and behind a
 *     hidden menu, with one discreet version marker left in the open;
 *  4. **the demonstration says what it is** in a refined persistent badge that
 *     opens to the whole sentence rather than a paragraph of orange.
 *
 * What it deliberately does **not** change, because those are stages 2 to 4:
 * the screens' art direction, the panel's design, and anything about
 * performance beyond the projection loop above staying out of React.
 *
 * Nothing here is a measurement of performance or of how it looks; the
 * container this is built in renders in software.
 */

export type View = 'room' | 'tabletop';

/**
 * How long the camera's travel into a selection lasts, in seconds.
 *
 * **Stage 3 removed the delay that used to follow it.** Stage 1 opened the
 * record `FLIGHT_SECONDS * 1000 + 120` ms after the press, so the move read
 * first; the owner's binding decision is that one tap does both concurrently,
 * so the window now opens in the same event and the flight runs underneath it
 * (`select`, below). The travel itself is unchanged, because the second half of
 * his sentence — *"and takes you there"* — still has to happen.
 */
export const FLIGHT_SECONDS = 0.9;

export interface BuildIdentity {
  sha: string;
  shortSha: string;
  date: string;
  stage: string;
}

export function MobileRoom({ build }: { build: BuildIdentity }) {
  const [demo, setDemo] = useState(true);
  const [mode, setMode] = useState<RunMode>(() => initialMode());
  const [speed, setSpeed] = useState<ReplaySpeed>(() => initialSpeed());
  const [view, setView] = useState<View>(() => initialView());
  const [focus, setFocus] = useState<MobileFocus>(() => initialFocus());
  const [win, setWin] = useState<WindowTarget | null>(() => initialWindow());
  const [origin, setOrigin] = useState<WindowOrigin | null>(null);
  const [dev, setDev] = useState(false);
  const [badgeOpen, setBadgeOpen] = useState(false);
  /**
   * **How many device pixels the world is drawn at.** Stage 3's answer to the
   * owner's crispness question, and the reasoning is in `pixelRatio.ts`: every
   * version to date drew a phone at 1.25× and let the panel upscale it to 3×.
   * `standard` is 2× and is the default; the hidden menu offers `native` and
   * `low` so the owner can judge the trade on his own device, which this
   * container cannot.
   */
  const [sharpness, setSharpness] = useState<Sharpness>(() => initialSharpness());
  /**
   * **The reduced-performance mode.** `auto` is the product's own behaviour —
   * it starts at `full` and the frame governor steps it down if the device
   * cannot hold its tier's budget. The other three are the reader's own
   * choice, and they are also how the twelve review states reach the reduced
   * presentation deterministically: `#/?perf=reduced` (`performance.ts`).
   */
  const [forcedLevel, setForcedLevel] = useState<Level | 'auto'>(() => initialLevel());
  const [governor, setGovernor] = useState<GovernorState>(() => newGovernor());
  const [hidden, setHidden] = useState(false);
  /**
   * **The software-renderer flag is now set, and it is load-bearing.**
   * Stage 1 left it hard-coded `false`; stage 2's six live displays made it
   * matter, because regenerating their mip chains every redraw took V11's
   * frame rate in this container from 1.74 to 1.23 fps
   * (`screens/v11/resolution.ts`). It is read once from the renderer
   * string at the first frame, which is one re-render at start-up and none
   * after.
   */
  const [settings, setSettings] = useState(() => ({
    reducedMotion: prefersReducedMotion() || forcedReducedMotion(),
    tier: detectTier(),
    autoTravel: false,
    softwareRenderer: false,
  }));
  const [insets, setInsets] = useState<Insets>(NO_INSETS);
  const [aspect, setAspect] = useState(() => viewportAspect());
  /**
   * **What the world is doing this frame, and why.** One object, derived: the
   * level (forced or governed), the plan that level names, and the tier the
   * plan steps the device down to. Everything below reads this rather than the
   * raw tier, so a single table in `performance.ts` decides the whole ladder
   * and no component can disagree with it.
   */
  const level: Level = forcedLevel === 'auto' ? governor.level : forcedLevel;
  const plan = LEVEL_PLANS[level];
  const tier = tierAfter(settings.tier, plan.tierSteps);
  const coarse = tier === 'constrained' || tier === 'mobile';
  const orientation = orientationFor(aspect);
  /**
   * The anchors follow the orientation, because the three slabs are not in the
   * same place in the two compositions (`screens/v11/bank.ts`). Rebuilt only
   * when the orientation changes, which is twice in a session at most.
   */
  const anchors = useMemo(() => buildAnchors(orientation), [orientation]);
  const backdrop = backdropFor(orientation);

  /**
   * The settings the whole scene reads. The **stepped** tier goes in here, not
   * the detected one, so the reduced-performance mode carries star density,
   * anisotropy and every other tier-driven cost with it through one channel
   * rather than through six props.
   */
  const scene = useMemo(() => ({ ...settings, tier }), [settings, tier]);

  /**
   * The in-world displays ask this, per frame, inside their own `useFrame`.
   * A module-level value and not context, because six components must not
   * re-render when it changes (`performance.ts`).
   */
  setSceneLoad({ redrawScale: plan.redrawScale, reason: level });

  /**
   * **Rendering stops when the page is hidden, and slows when a window covers
   * the world.** Both are the brief's own words. `loopFor` holds the rule and
   * the reasoning; here it is only read.
   */
  const drive = loopFor(hidden, win !== null);

  useEffect(() => {
    const onVisibility = () => setHidden(document.visibilityState === 'hidden');
    onVisibility();
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, []);

  setBandOnTwoLines(coarse);
  setBandReplay(mode === 'replay');

  // The press record every handler in the world asks (V10, defect A). One
  // watcher, installed here, exactly as V10 installs it from its own room.
  useEffect(() => watchGestures(), []);

  useEffect(() => {
    setInsets(readInsets());
    const onResize = () => {
      setInsets(readInsets());
      setAspect(viewportAspect());
    };
    window.addEventListener('resize', onResize);
    window.addEventListener('orientationchange', onResize);
    return () => {
      window.removeEventListener('resize', onResize);
      window.removeEventListener('orientationchange', onResize);
    };
  }, []);

  /**
   * **One tap does both, concurrently** — and this is stage 3 reversing a
   * stage-1 decision on the owner's own instruction, recorded rather than
   * quietly changed.
   *
   * Stage 1 built the brief's stage-1 line — *"tapping triggers a deliberate
   * camera transition before the interface opens"* — as a 1.02 s delay before
   * the record appeared. The owner had already decided otherwise, in
   * `docs/process/PHASE_1_CONVERSATION_INTERFACE.md` §5b, against this
   * session's own recommendation: *"tapping a screen opens the panel straight
   * away and takes you there — but the panel opens up so you can see it
   * instantly, while you are being taken there. So you arent waiting to be
   * taken there first."* That decision governs, so the window is set and the
   * camera is set in the same event: **the window is up immediately and the
   * flight runs underneath it.**
   *
   * The window renders from data and never waits for a frame
   * (`window/AgentWindow.tsx`), so there is nothing here that could make it
   * wait. `verify:owner:v11` drives the press and measures that the window is
   * already open while the camera is still moving — the inverse of the
   * assertion stage 1 made, changed deliberately and not relaxed.
   */
  const lastSelection = useRef({ id: '', at: 0 });
  const select = (id: string, to: MobileFocus, target: WindowTarget) => {
    const now = performance.now();
    // The world's own raycast handler and this layer's hit test can both
    // answer one press. Whichever arrives first wins; the other is ignored.
    if (lastSelection.current.id === id && now - lastSelection.current.at < 700) return;
    lastSelection.current = { id, at: now };
    // Where the character's display is on screen at the moment of the tap, so
    // the window can expand out of it rather than appear over it.
    const projected = projections()[id];
    setOrigin(projected && projected.visible ? { x: projected.x, y: projected.y } : null);
    setFocus(to);
    setWin(target);
  };
  const toOverview = () => {
    lastSelection.current = { id: '', at: 0 };
    setWin(null);
    setFocus('all');
  };
  const selectAnchor = (id: string, row?: number) => {
    const anchor = anchors.find((candidate) => candidate.id === id);
    if (!anchor) return;
    // A ledger row opens that hop's own agent, which is the owner's decision
    // of 8 September: the row carries shape and colour at distance and the
    // window carries the whole of it.
    const target = row === undefined ? anchor.window : windowForLedgerRow(demoSnapshot(), row);
    select(anchor.id, anchor.focus, target);
  };
  /** Another agent's window, without going back to the world first. */
  const goToAgent = (agent: Agent, at?: string) => {
    const anchor = anchors.find((candidate) => candidate.id === agent);
    lastSelection.current = { id: '', at: 0 };
    setFocus(anchor ? anchor.focus : 'virgil');
    setWin(at === undefined ? { agent } : { agent, at });
  };

  // What the verifier drives the interface through. Two values and one
  // function; no state is settable from here, so nothing in the product
  // depends on it existing.
  useEffect(() => {
    const w = window as Window & {
      __virgilV11?: {
        focus: string;
        window: string | null;
        section: string | null;
        orientation: string;
        level: Level;
        tier: string;
        loop: string;
        pixelRatioCeiling: number;
        redrawScale: number;
        post: boolean;
        shadows: boolean;
      };
      __virgilV11Reset?: () => void;
    };
    w.__virgilV11 = {
      focus,
      window: win ? win.agent : null,
      section: win?.at ?? null,
      orientation,
      level,
      tier,
      loop: drive.loop,
      pixelRatioCeiling: ceilingFor(settings.tier, sharpness, undefined, {
        cssWidth: window.innerWidth,
        cssHeight: window.innerHeight,
        devicePixelRatio: window.devicePixelRatio,
      }),
      redrawScale: plan.redrawScale,
      post: plan.post && !coarse,
      shadows: plan.shadows && !coarse,
    };
    w.__virgilV11Reset = toOverview;
  });

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target && ['INPUT', 'SELECT', 'TEXTAREA', 'BUTTON'].includes(target.tagName)) return;
      if (event.key === '1') selectAnchor('virgil');
      else if (event.key === '2') selectAnchor('fabricator');
      else if (event.key === '3') selectAnchor('prover');
      else if (event.key === '4') selectAnchor('keeper');
      else if (event.key === '5') selectAnchor('board-verdict');
      else if (event.key === '0' || event.key === 'Escape') toOverview();
      else if (event.key === 'd' || event.key === 'D') setDev((open) => !open);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const start = mobilePose(focus, aspect);
  const focused = focus !== 'all' || win !== null;
  /**
   * **The way back is never hidden now, and that is stage 3 fixing stage 1's
   * recorded compromise.** Stage 1 wrote here that in portrait the sheet covers
   * the corner the station's control sits in, so the way home was unreachable
   * until the record was closed — two taps from an open record — and it named
   * folding "home" into the panel as stage 3's job.
   *
   * The window now carries its own back chevron in its header
   * (`window/AgentWindow.tsx`), so there is a visible way back at every level
   * and **back is one step per level**, which is the owner's decision: window →
   * station → overview, matching the three distances. This control is the
   * station's step, and it is hidden only while the window is over it, where a
   * second control would be both unreachable and redundant.
   */
  const showBack = focus !== 'all' && win === null;

  /**
   * The hit test. It runs on the stage, alongside the world's own raycast, and
   * it asks `gesture.ts` first — so a drag across a target opens nothing, which
   * is the owner's own defect and is driven in `verify-owner-build-v11.ts`
   * rather than asserted.
   */
  const onStagePointerDown = (event: React.PointerEvent) => {
    setPressed(targetAt(event.clientX, event.clientY));
  };
  const onStagePointerUp = (event: React.PointerEvent) => {
    const id = targetAt(event.clientX, event.clientY);
    setPressed(null);
    if (id === null) return;
    if (!wasTap()) return;
    selectAnchor(id);
  };

  return (
    <SettingsContext.Provider value={scene}>
      <div
        className={`v11-stage${focused ? ' is-focused' : ''}${win ? ' has-window' : ''}`}
        data-orientation={orientation}
        onPointerDown={onStagePointerDown}
        onPointerUp={onStagePointerUp}
        onPointerCancel={() => setPressed(null)}
      >
        <Canvas
          shadows={!coarse && plan.shadows}
          frameloop={drive.loop}
          /**
           * **The detected tier, not the stepped one, and the verifier caught
           * why.** The ladder steps the tier down to shed the scene's own
           * costs — stars, anisotropy, shadows. But the pixel-ratio ceiling is
           * also read per tier, so stepping to `constrained` silently dropped
           * the ceiling from 2 to 1.25: `reduced` came out **blurrier than
           * full at a device pixel ratio of 3**, which is the one thing the
           * brief forbids. `verify:owner:v11` failed on it with those two
           * numbers.
           *
           * So resolution has exactly one lever, `plan.pixelScale`, and only
           * the last rung of the ladder pulls it.
           */
          dpr={dprFor(
            settings.tier,
            sharpness,
            typeof window === 'undefined' ? 1 : window.devicePixelRatio,
            {
              cssWidth: typeof window === 'undefined' ? 1280 : window.innerWidth,
              cssHeight: typeof window === 'undefined' ? 800 : window.innerHeight,
              devicePixelRatio: typeof window === 'undefined' ? 1 : window.devicePixelRatio,
            },
            plan.pixelScale,
          )}
          gl={{
            antialias: true,
            toneMapping: THREE.ACESFilmicToneMapping,
            toneMappingExposure: 0.92,
            powerPreference: 'high-performance',
          }}
          camera={{ position: start.position, fov: start.fov, near: 0.2, far: 400 }}
          onCreated={({ gl }) => {
            const software = registerRenderer(gl);
            if (software) setSettings((previous) => ({ ...previous, softwareRenderer: true }));
          }}
          onPointerMissed={() => undefined}
        >
          <Backdrop view={view} />
          {/*
            **"Load Virgil and the critical foreground first and defer
            secondary assets" — measured, and it buys nothing here.**

            The brief lists it. There is no network in an Owner Build — every
            payload is already inside the one document — so "load" can only
            mean *decode and upload*, and the only thing deferral can change is
            which subtree the first painted frame waits for. So it was built,
            measured, and left switched off:

            | at 390 x 844, three runs | cast on screen | backdrop on screen |
            | split into two boundaries | 13.79 / 13.82 / 13.70 s | 2.39 / 2.61 / 2.54 s |

            **The cast is eleven seconds *later* than the backdrop, not
            earlier**, because Virgil's rigged payload is 1.16 MB against the
            two backdrop planes' 0.65 MB. Deferring the backdrop therefore
            cannot make Virgil arrive sooner; he was never waiting for it. What
            the split does instead is paint a command centre **with nobody in
            it** for eleven seconds — a picture that says something this system
            can never actually be, which is the one thing this project does not
            ship.

            So the default is one boundary, in exactly the order V10 renders
            in, and `#/?defer=1` keeps the experiment reproducible from the
            committed artifact rather than only from this comment.
          */}
          {deferBackdrop() ? (
            <>
              <Suspense fallback={null}>
                <LightingRig view={view} />
                <Cast
                  demo={demo}
                  mode={mode}
                  speed={speed}
                  focus={focus}
                  orientation={orientation}
                  onSelect={selectAnchor}
                />
                <CastReady />
              </Suspense>
              <Suspense fallback={null}>
                <Stage view={view} backdrop={backdrop} />
                <Orrery />
                <Ready />
              </Suspense>
            </>
          ) : (
            <Suspense fallback={null}>
              <LightingRig view={view} />
              <Stage view={view} backdrop={backdrop} />
              <Orrery />
              <Cast
                demo={demo}
                mode={mode}
                speed={speed}
                focus={focus}
                orientation={orientation}
                onSelect={selectAnchor}
              />
              <CastReady />
              <Ready />
            </Suspense>
          )}
          <Rig focus={focus} aspect={aspect} />
          <TouchProjector anchors={anchors} />
          <Governor
            active={forcedLevel === 'auto' && drive.loop === 'always' && !settings.softwareRenderer}
            budgetMs={FRAME_BUDGET_MS[settings.tier]}
            onSample={setGovernor}
          />
          <Metronome fps={drive.fps} />
          {coarse || !plan.post ? null : <Post view={view} />}
        </Canvas>

        <TouchTargets anchors={anchors} insets={insets} />

        {/* Every piece of chrome stops its own pointer events at its root, or
            the same `.v11-stage` event source raycasts a press on a button
            into the scene (V10, defect B). */}
        <div
          className="v11-chrome"
          onPointerDown={(event) => event.stopPropagation()}
          onPointerUp={(event) => event.stopPropagation()}
        >
          <BackControl shown={showBack} onBack={toOverview} label={backLabel(focus, anchors)} />
          <DevEntry open={dev} onToggle={() => setDev((value) => !value)} />
          <DemoBadge
            mode={mode}
            speed={speed}
            open={badgeOpen}
            onToggle={() => setBadgeOpen((value) => !value)}
          />
          <PerformanceNotice level={level} forced={forcedLevel !== 'auto'} />
          <TalkBar
            marker={`V11 · stage 4 · ${build.shortSha}`}
            onTalk={() => select('virgil', 'virgil', { agent: 'virgil' })}
          />
          {dev ? (
            <DevPanel
              build={build}
              sharpness={sharpness}
              setSharpness={setSharpness}
              level={level}
              forcedLevel={forcedLevel}
              setForcedLevel={setForcedLevel}
              governor={governor}
              tier={tier}
              detectedTier={settings.tier}
              loop={drive.loop}
              demo={demo}
              setDemo={setDemo}
              mode={mode}
              setMode={setMode}
              speed={speed}
              setSpeed={setSpeed}
              view={view}
              setView={setView}
              focus={focus}
              onLookAt={(next) => {
                setWin(null);
                setFocus(next);
              }}
              onClose={() => setDev(false)}
            />
          ) : null}
        </div>

        {/* The window: DOM, outside the canvas, rendered from data. Its own
            chevron is one step back — to the station the tap took the reader
            to, never snapped back to the overview. */}
        <AgentWindow target={win} origin={origin} onClose={() => setWin(null)} onGo={goToAgent} />
      </div>
    </SettingsContext.Provider>
  );
}

// --------------------------------------------------------------------- chrome

/** The way back. One control, always in the same place, 48 px square. */
function BackControl({
  shown,
  onBack,
  label,
}: {
  shown: boolean;
  onBack: () => void;
  label: string;
}) {
  if (!shown) return null;
  return (
    <button type="button" className="v11-back" data-touch-target="back" onClick={onBack}>
      <span className="v11-back-glyph" aria-hidden="true">
        ←
      </span>
      <span className="v11-back-word">{label}</span>
    </button>
  );
}

function backLabel(focus: MobileFocus, anchors: Anchor[]): string {
  if (focus === 'all') return 'Overview';
  const anchor = anchors.find((candidate) => candidate.focus === focus);
  return anchor ? 'Overview' : 'Overview';
}

/**
 * The one way into the development menu: a discreet mark, not a toolbar. It is
 * a touch target like any other because a control a thumb cannot hit is not a
 * control.
 */
function DevEntry({ open, onToggle }: { open: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      className={`v11-dev-entry${open ? ' is-open' : ''}`}
      data-touch-target="dev"
      aria-expanded={open}
      aria-label="Development menu"
      onClick={onToggle}
    >
      <span aria-hidden="true">⋯</span>
    </button>
  );
}

/**
 * **The badge, refined but never softened.** V10 put a whole paragraph of
 * orange across the foot of the screen. This is a pill that says `Demo data`
 * and, on selection, the sentence in full. Two things it may not do: disappear,
 * and imply that anything on screen came from a live repository. Both modes get
 * their own colour and their own words, as V10 established, because they make
 * opposite claims about their own truthfulness.
 */
function DemoBadge({
  mode,
  speed,
  open,
  onToggle,
}: {
  mode: RunMode;
  speed: ReplaySpeed;
  open: boolean;
  onToggle: () => void;
}) {
  const recorded = mode === 'replay';
  return (
    <div className={`v11-badge-dock${open ? ' is-open' : ''}`}>
      <button
        type="button"
        className={`v11-badge${recorded ? ' is-recorded' : ''}`}
        data-touch-target="badge"
        aria-expanded={open}
        aria-label={recorded ? 'Recorded run — what this means' : 'Demo data — what this means'}
        onClick={onToggle}
      >
        <span className="v11-badge-dot" aria-hidden="true" />
        <span className="v11-badge-word">{recorded ? 'Recorded run' : 'Demo data'}</span>
        <span className="v11-badge-more" aria-hidden="true">
          {open ? '×' : 'i'}
        </span>
      </button>
      {open ? (
        <p className={`v11-badge-body${recorded ? ' is-recorded' : ''}`} role="status">
          {recorded ? (
            <>
              This is the Phase 0 consolidation, a run that actually happened, replayed at{' '}
              {compressionOf(speed)}×. It began {recordedClock(RUN.startedAt)} and ran{' '}
              {recordedDuration(RUN_SECONDS)}. Candidate 3b9a964e was reviewed, passed with
              non-blocking findings and merged as {RUN.mergeSha.slice(0, 7)}. Every figure is read
              out of this repository's committed record. It is past fact, not live state.
            </>
          ) : (
            <>
              This is a scripted demonstration. No repository event, check or live session drives
              the information currently shown.
            </>
          )}
        </p>
      ) : null}
    </div>
  );
}

/**
 * The one elegant, obvious way into Virgil's conversation, and the one place
 * build identity survives in the ordinary interface.
 *
 * **The marker is the coordinator's judgment, not the owner's instruction**
 * (`docs/process/V11_BRIEF.md`, caution 1). The brief permits the whole footer
 * to move into the hidden menu, and it has; the stage line is what diagnosed
 * the day the owner was served a stale build, and removing every trace of build
 * identity makes the next such incident much harder to resolve. If the owner
 * wants it gone, deleting this one span is the whole change.
 */
function TalkBar({ marker, onTalk }: { marker: string; onTalk: () => void }) {
  return (
    <div className="v11-dock">
      <button type="button" className="v11-talk" data-touch-target="talk" onClick={onTalk}>
        <span className="v11-talk-glyph" aria-hidden="true">
          ◆
        </span>
        <span className="v11-talk-word">Talk to Virgil</span>
      </button>
      <span className="v11-marker">{marker}</span>
    </div>
  );
}

/**
 * **The development chrome, out of the ordinary experience.** Demo On/Off, the
 * two run modes and their speeds, the Tabletop/Room selector with the retired
 * room behind it, the Look-at buttons, the keyboard instructions, the build SHA
 * and build minute, and the performance disclaimer. Every one of them was in
 * the owner's face at V10; none of them belongs to somebody looking at their
 * command centre.
 *
 * The reproducibility path is untouched by the move: the entry points the
 * captures use are query parameters on the hash (`#/?run=replay`,
 * `#/?cam=prover`, `#/?view=room`, `#/?state=blocked`), not these buttons, and
 * they are read at mount exactly as V10 reads them.
 */
function DevPanel({
  build,
  sharpness,
  setSharpness,
  level,
  forcedLevel,
  setForcedLevel,
  governor,
  tier,
  detectedTier,
  loop,
  demo,
  setDemo,
  mode,
  setMode,
  speed,
  setSpeed,
  view,
  setView,
  focus,
  onLookAt,
  onClose,
}: {
  build: BuildIdentity;
  sharpness: Sharpness;
  setSharpness: (value: Sharpness) => void;
  level: Level;
  forcedLevel: Level | 'auto';
  setForcedLevel: (value: Level | 'auto') => void;
  governor: GovernorState;
  tier: string;
  detectedTier: string;
  loop: string;
  demo: boolean;
  setDemo: (value: boolean) => void;
  mode: RunMode;
  setMode: (value: RunMode) => void;
  speed: ReplaySpeed;
  setSpeed: (value: ReplaySpeed) => void;
  view: View;
  setView: (value: View) => void;
  focus: MobileFocus;
  onLookAt: (focus: MobileFocus) => void;
  onClose: () => void;
}) {
  return (
    <div className="v11-dev-panel" role="dialog" aria-label="Development menu">
      <header className="v11-dev-head">
        <span>Development</span>
        <button type="button" className="v11-dev-close" onClick={onClose}>
          Close
        </button>
      </header>
      <p className="v11-dev-note">
        Not part of the ordinary experience. Everything below is a switch for looking at the build,
        not a feature of the product.
      </p>
      <div className="v11-dev-row">
        <span className="v11-dev-label">Demo</span>
        <button type="button" className={demo ? 'is-active' : ''} onClick={() => setDemo(true)}>
          On
        </button>
        <button type="button" className={demo ? '' : 'is-active'} onClick={() => setDemo(false)}>
          Off
        </button>
      </div>
      <div className="v11-dev-row">
        <span className="v11-dev-label">Run</span>
        <button
          type="button"
          className={mode === 'demo' ? 'is-active' : ''}
          onClick={() => setMode('demo')}
        >
          Scripted
        </button>
        <button
          type="button"
          className={mode === 'replay' ? 'is-active' : ''}
          onClick={() => setMode('replay')}
        >
          Replay
        </button>
      </div>
      {mode === 'replay' ? (
        <div className="v11-dev-row">
          <span className="v11-dev-label">Speed</span>
          {REPLAY_SPEEDS.map((option) => (
            <button
              type="button"
              key={option}
              className={speed === option ? 'is-active' : ''}
              onClick={() => setSpeed(option)}
              title={`${recordedDuration(RUN_SECONDS)} of recorded work in ${PLAYBACK_SECONDS[option]} seconds of screen time`}
            >
              {speedLabel(option)}
            </button>
          ))}
        </div>
      ) : null}
      <div className="v11-dev-row">
        <span className="v11-dev-label">View</span>
        <button
          type="button"
          className={view === 'tabletop' ? 'is-active' : ''}
          onClick={() => setView('tabletop')}
        >
          Tabletop
        </button>
        <button
          type="button"
          className={view === 'room' ? 'is-active' : ''}
          onClick={() => setView('room')}
          title="The room is retired, not removed"
        >
          Room (retired)
        </button>
      </div>
      {/* The sharpness selector. A diagnostic, not a product feature: the
          owner asked whether the text can be crisper, the cause is the canvas's
          pixel ratio, and the cost of raising it cannot be measured in a
          software renderer. So he can answer it on his own phone. */}
      <div className="v11-dev-row">
        <span className="v11-dev-label">Sharpness</span>
        {SHARPNESS.map((option) => (
          <button
            type="button"
            key={option.id}
            className={sharpness === option.id ? 'is-active' : ''}
            onClick={() => setSharpness(option.id)}
            title={option.note}
          >
            {option.label}
          </button>
        ))}
      </div>
      {/* **The reduced-performance mode, forced.** `Auto` is the product's
          own behaviour and the default; the other three are how the twelve
          review states reach the reduced presentation deterministically, and
          how the owner can see on his own phone what the mode gives up before
          his device ever asks for it. `#/?perf=reduced` does the same. */}
      <div className="v11-dev-row">
        <span className="v11-dev-label">Performance</span>
        {(['auto', ...LEVELS] as (Level | 'auto')[]).map((option) => (
          <button
            type="button"
            key={option}
            className={forcedLevel === option ? 'is-active' : ''}
            onClick={() => setForcedLevel(option)}
            title={
              option === 'auto'
                ? 'Measure the frames and step down only if the device cannot hold its budget.'
                : LEVEL_PLANS[option].note
            }
          >
            {option === 'auto' ? 'Auto' : LEVEL_PLANS[option].label}
          </button>
        ))}
      </div>
      <p className="v11-dev-keys">
        Now: <code>{level}</code> at tier <code>{tier}</code> (detected <code>{detectedTier}</code>
        ), loop <code>{loop}</code>, screens ×<code>{LEVEL_PLANS[level].redrawScale}</code>.
        Governor:{' '}
        {governor.lastMeanMs > 0
          ? `${governor.lastMeanMs} ms a frame. `
          : 'no window sampled yet. '}
        {governor.reason} No performance figure taken here describes a device.
      </p>
      <div className="v11-dev-row">
        <span className="v11-dev-label">Look at</span>
        {(['all', 'virgil', ...ROLES, 'board'] as MobileFocus[]).map((who) => (
          <button
            type="button"
            key={who}
            className={focus === who ? 'is-active' : ''}
            onClick={() => onLookAt(who)}
          >
            {who === 'all'
              ? 'All'
              : who === 'virgil'
                ? 'Virgil'
                : who === 'board'
                  ? 'Board'
                  : CAST[who as Role].label}
          </button>
        ))}
      </div>
      <p className="v11-dev-keys">
        Keys: 1–4 the cast, 5 the board, 0 or Esc the overview, D this menu. Drag to look around;
        pinch or scroll to move closer. Ordinary navigation does not need any of it.
      </p>
      <p className="v11-dev-keys">
        V10, unchanged, is at <code>#/v10</code> in this same file. The rejected Phase 0 spikes are
        at <code>#/spike/foundry</code> and <code>#/spike/mind</code>.
      </p>
      <footer className="v11-dev-foot">
        <span>
          <b>Virgil Owner Build</b> — {build.stage}
        </span>
        <span>
          built from commit <code>{build.sha}</code>
        </span>
        <span>
          built <code>{build.date}</code>
        </span>
        <span className="v11-dev-warn">
          Performance on this machine is not a measurement and is not recorded as one. The two
          graphics-hardware checks in OD-0005 are deferred and recorded as not performed, never as
          met. Every iPhone check behind this build is a simulated viewport in headless Chromium; no
          real device has been used.
        </span>
      </footer>
    </div>
  );
}

// ----------------------------------------------------------------- the scene

/**
 * The set itself: the retired room, or the tabletop the world has run on since
 * V7. Exactly the assembly V10 renders, lifted into one component only so the
 * two Suspense arrangements above can both name it without duplicating it.
 */
function Stage({
  view,
  backdrop,
}: {
  view: View;
  backdrop: {
    planetAt: readonly [number, number, number];
    stationAt: readonly [number, number, number];
  };
}) {
  if (view === 'room') {
    return (
      <>
        <RoomShell />
        <WindowView />
        <PortholeFrame />
      </>
    );
  }
  return (
    <>
      <Tabletop planetAt={backdrop.planetAt} stationAt={backdrop.stationAt} />
      <FloorSheen />
    </>
  );
}

/** The clear colour: the nebula's dust in the room, deep space on the tabletop. */
function Backdrop({ view }: { view: View }) {
  const gl = useThree((s) => s.gl);
  useEffect(() => {
    gl.setClearColor(new THREE.Color(view === 'room' ? room.nebula.dust : '#04051a'));
  }, [gl, view]);
  return null;
}

/**
 * Everyone in the set and everything they read. The same assembly V10 renders;
 * only the callbacks differ, because a selection here is one deliberate move
 * rather than two simultaneous ones.
 */
function Cast({
  demo,
  mode,
  speed,
  focus,
  orientation,
  onSelect,
}: {
  demo: boolean;
  mode: RunMode;
  speed: ReplaySpeed;
  /**
   * What the camera is looking at. A console's display powers on while it
   * is the focus, which is the fix for the close-up black screen stage 1
   * found (`screens/v11/ConsoleScreenV11.tsx`).
   */
  focus: MobileFocus;
  /** Which cluster the slabs hang in: portrait's or landscape's. */
  orientation: 'portrait' | 'landscape';
  onSelect: (id: string, row?: number) => void;
}) {
  const forced = forcedFace();
  /**
   * **`#/?hold=1` freezes the demonstration at the second the URL names**, and
   * it is what makes the twelve review states of stage 4 reachable rather than
   * approximately reachable. `#/?demo=<t>&loop=<n>` already chose where the
   * clock starts; it then ran, and in a container that renders at 1.5 frames a
   * second the beat a capture lands on was a matter of luck. Held, the state is
   * exactly `demoAt(t, loop, true)` — the same pure function every screen and
   * every window already reads — and two runs of the same URL give the same
   * picture.
   *
   * It holds the **demonstration**, not the world: the camera still flies, the
   * characters still breathe, the visors still animate, the hover still hovers.
   * Nothing about the product changes when it is absent, and `useDemo` is
   * still what runs then.
   */
  const held = holdAt();
  const scripted = useDemo(demo && forced === null && mode === 'demo' && held === null);
  const replayed = useReplay(demo && forced === null && mode === 'replay', speed);
  const running = mode === 'replay' ? replayed : scripted;
  const frozen = useMemo(() => (held === null ? null : demoAt(held.t, held.loop, true)), [held]);
  const state = forced ? forcedState(forced) : (frozen ?? running);
  publishDemoState(state);
  // The recorded run's real duration and real branch, for the two surfaces
  // that were inventing them (KS4-02, KS4-04). Added here rather than in
  // `replayAt` because V10's world imports the replay and V11 may not move
  // V10's bytes — `screens/v11/recorded.ts` says it at length.
  const content = contentFor(state.content, state.mode);
  const virgilBusy = state.pose !== 'rest' || state.virgilFace !== 'idle';
  return (
    <>
      <VirgilConsole active={virgilBusy && !content.ownerGate} />
      <VirgilRigged pose={state.pose} face={state.virgilFace} onSelect={() => onSelect('virgil')} />
      <ScreenBankV11
        orientation={orientation}
        content={content}
        outcome={state.outcome}
        seconds={state.seconds}
        mode={state.mode}
        speed={speed}
        onOpen={(slab: SlabName, row?: number) => onSelect(`board-${slab}`, row)}
      />
      {ROLES.map((role) => {
        const member = state.cast[role];
        return (
          <group key={role}>
            <Station role={role} active={member.activity !== 'rest'} />
            <Figure
              role={role}
              face={member.face}
              activity={member.activity}
              onSelect={() => onSelect(role)}
            />
            <ConsoleScreenV11
              role={role}
              state={member.station}
              report={member.report}
              outcome={state.outcome}
              work={member.work}
              quiet={content.ownerGate ? 0.75 : 0}
              attention={focus === role}
              showBand={state.mode === 'replay'}
              candidateId={content.candidateId}
              branch={content.branch}
              onOpen={() => onSelect(`${role}-screen`)}
            />
            <StationLight role={role} activity={member.activity} report={member.report} />
          </group>
        );
      })}
    </>
  );
}

/**
 * **The frame governor, and the one thing it deliberately does not do here.**
 *
 * It samples the frame time inside the render loop, hands the result to
 * `observeFrame` (`performance.ts`), and re-renders the chrome only when the
 * level or the measured mean actually changes — never once a frame.
 *
 * `active` is false whenever the renderer is software, and that is a decision
 * rather than an oversight. This container rasterises through SwiftShader at
 * about 1.5 frames a second, which is twenty times the mobile tier's budget:
 * left running, the governor would step every capture, every verification and
 * every frame in this record down to `minimal` and nothing here would show
 * what the product does on a device. A software rasteriser's frame time is not
 * evidence about a phone, so it is not treated as evidence.
 *
 * **The consequence is stated rather than hidden: the step-down path is
 * exercised by `test/performance-v11.test.ts` over a synthetic frame trace and
 * by forcing a level in the hidden menu, and it has never been observed
 * engaging on a real device, because no real device has been used.**
 */
function Governor({
  active,
  budgetMs,
  onSample,
}: {
  active: boolean;
  budgetMs: number;
  onSample: (state: GovernorState) => void;
}) {
  const state = useRef(newGovernor());
  useFrame((_, delta) => {
    if (!active) return;
    const before = state.current;
    const after = observeFrame(before, delta * 1000, budgetMs);
    state.current = after;
    if (after.level !== before.level || after.lastMeanMs !== before.lastMeanMs) onSample(after);
  });
  return null;
}

/**
 * **What drives the loop when the loop is not driving itself.** With
 * `frameloop="demand"` — which is what a window open over the world selects —
 * nothing redraws until something asks, so this asks, `fps` times a second.
 * At zero it does nothing at all, which is the `always` and `never` cases.
 */
function Metronome({ fps }: { fps: number }) {
  const invalidate = useThree((s) => s.invalidate);
  useEffect(() => {
    if (fps <= 0) return;
    const id = window.setInterval(() => invalidate(), Math.round(1000 / fps));
    return () => window.clearInterval(id);
  }, [fps, invalidate]);
  return null;
}

/**
 * **A tier change is never silent** (`PERFORMANCE_STRATEGY.md`). One discreet
 * line, only when the world is doing less than it was authored to do, saying
 * which and why in the reader's own words rather than in a tier name.
 *
 * It is `role="status"` and not a button: it carries no action, so it is not a
 * touch target and it is not required to measure 44 px. It carries no
 * demonstration vocabulary either — the one `Demo data` chip the owner asked
 * for stays the only thing in this interface that speaks about the
 * demonstration.
 */
function PerformanceNotice({ level, forced }: { level: Level; forced: boolean }) {
  if (level === 'full') return null;
  const plan = LEVEL_PLANS[level];
  return (
    <div className="v11-perf" role="status">
      <span className="v11-perf-dot" aria-hidden="true" />
      <span className="v11-perf-word">
        {/*
          **The Keeper's KS4-09.** The governor-chosen wording was
          `Reduced to ${plan.label.toLowerCase()}`, which reads
          "Reduced to reduced" at the middle rung. It says *who chose this*,
          so the verb is now the governor's action rather than the rung's
          own name: "Stepped down to reduced", "Stepped down to minimal".
          Only reachable where the governor engages, which is no hardware
          this project has measured on, so it is corrected and recorded and
          not demonstrated. The forced string, which is the one in the
          deliverable frame, is unchanged.
        */}
        {forced ? `${plan.label} performance mode` : `Stepped down to ${plan.label.toLowerCase()}`}
      </span>
    </div>
  );
}

/** The post pipeline for the style, exactly as V10 grades it. */
function Post({ view }: { view: View }) {
  return (
    <EffectComposer multisampling={0} enableNormalPass={false}>
      <Bloom
        intensity={0.38}
        luminanceThreshold={0.86}
        luminanceSmoothing={0.25}
        mipmapBlur
        resolutionScale={0.5}
      />
      <HueSaturation hue={0} saturation={0.22} />
      <BrightnessContrast brightness={0.02} contrast={-0.1} />
      {view === 'tabletop' ? <Noise premultiply opacity={0.09} /> : <></>}
      <Vignette eskil={false} offset={0.3} darkness={0.38} />
    </EffectComposer>
  );
}

interface Limits {
  minPolarAngle: number;
  maxPolarAngle: number;
  minAzimuthAngle: number;
  maxAzimuthAngle: number;
  minDistance: number;
  maxDistance: number;
}

const UNBOUNDED: Limits = {
  minPolarAngle: 0,
  maxPolarAngle: Math.PI,
  minAzimuthAngle: Number.NEGATIVE_INFINITY,
  maxAzimuthAngle: Number.POSITIVE_INFINITY,
  minDistance: 0.5,
  maxDistance: 60,
};

/**
 * The orbit's limits once the camera has arrived. Tighter than V10's, because
 * **ordinary navigation must not depend on free camera movement**: a thumb may
 * nudge the view for pleasure, and every place the interface needs to reach is
 * reachable by tapping the thing itself. Every bound is derived from the pose
 * the rig has just authored, so no clamp can disagree with where the camera has
 * been put — the V8 defect this idiom exists to prevent.
 */
export function mobileLimits(pose: CameraPose, focus: MobileFocus): Limits {
  const dx = pose.position[0] - pose.target[0];
  const dz = pose.position[2] - pose.target[2];
  const dy = pose.position[1] - pose.target[1];
  const azimuth = Math.atan2(dx, dz);
  const polar = Math.atan2(Math.hypot(dx, dz), dy);
  const distance = Math.hypot(dx, dy, dz);
  if (focus !== 'all') {
    return {
      minPolarAngle: polar - 0.3,
      maxPolarAngle: polar + 0.3,
      minAzimuthAngle: azimuth - 0.55,
      maxAzimuthAngle: azimuth + 0.55,
      minDistance: Math.min(1.4, distance),
      maxDistance: Math.max(focus === 'board' ? 14 : 6, distance),
    };
  }
  return {
    minPolarAngle: polar - 0.32,
    /**
     * **The downward travel is 0.06 rad, and it was 0.18.**
     *
     * The owner photographed his own iPhone at the old limit and the top screen
     * was **clipped**. Stage 3 answers that twice over: the old lowest position
     * is the new default (`composition.ts`, `PORTRAIT_FRAME.elevation`), and
     * the travel below it is now small enough that a nudge cannot put a slab
     * back into the Dynamic Island's band. 0.06 rad is 3.44° of a 58° vertical
     * lens, which lifts the picture by about 50 px of 844 — measured, and
     * asserted at the extreme rather than only at the default, in
     * `test/cluster-v11-s3.test.ts`.
     *
     * **And the zoom is the other half of it, which measurement found and
     * reasoning had missed.** Rotating to the old lower limit moves the
     * primary's top edge by less than half a pixel — the slabs sit near the
     * target's own depth, so the angle barely changes their vertical offset.
     * Pulling in to `0.68 ×`, though, magnifies by 1.47 about the frame's
     * centre, and that takes the primary's top edge from 133 px **past the top
     * of the screen**. That is what clipped it. So the overview's nearest stand
     * is `0.84 ×`, which is the measured figure that leaves the primary's top
     * edge clear of the island at the lowest angle **and** the nearest stand at
     * once — the two together, because that is the pose a reader can actually
     * reach.
     *
     * The camera stays movable, as the owner asked — *"we could potentially
     * even, like, lock that in place, but we can do that later. Still make it
     * movable"* — and a focused view keeps its own, wider limits below.
     */
    maxPolarAngle: polar + 0.06,
    minAzimuthAngle: azimuth - Math.PI / 5,
    maxAzimuthAngle: azimuth + Math.PI / 5,
    minDistance: distance * 0.84,
    maxDistance: distance * 1.35,
  };
}

function applyLimits(controls: ComponentRef<typeof OrbitControls>, limits: Limits): void {
  controls.minPolarAngle = limits.minPolarAngle;
  controls.maxPolarAngle = limits.maxPolarAngle;
  controls.minAzimuthAngle = limits.minAzimuthAngle;
  controls.maxAzimuthAngle = limits.maxAzimuthAngle;
  controls.minDistance = limits.minDistance;
  controls.maxDistance = limits.maxDistance;
}

/**
 * Orbit, and the driver that carries the camera to a focus's pose. The limits
 * are written onto the controls imperatively in the same frame as the pose and
 * never as React props — V8's defect, recorded at length in `VirgilRoom.tsx`,
 * and not repeated here.
 */
function Rig({ focus, aspect }: { focus: MobileFocus; aspect: number }) {
  const controls = useRef<ComponentRef<typeof OrbitControls>>(null);
  const camera = useThree((s) => s.camera);
  const size = useThree((s) => s.size);
  const canvasAspect = Math.round((size.width / Math.max(1, size.height)) * 10) / 10;
  const { reducedMotion } = useSettings();
  const limits = useRef<Limits>(UNBOUNDED);
  const flight = useRef<{
    from: { p: THREE.Vector3; t: THREE.Vector3 };
    to: CameraPose;
    elapsed: number;
    seconds: number;
    limits: Limits;
  } | null>(null);
  const first = useRef(true);

  useEffect(() => {
    const to = mobilePose(focus, canvasAspect);
    const c = controls.current;
    flight.current = {
      from: {
        p: camera.position.clone(),
        t: c ? c.target.clone() : new THREE.Vector3(...to.target),
      },
      to,
      elapsed: 0,
      seconds: reducedMotion || first.current ? 0 : FLIGHT_SECONDS,
      limits: mobileLimits(to, focus),
    };
    first.current = false;
    limits.current = UNBOUNDED;
    if (c) applyLimits(c, UNBOUNDED);
  }, [focus, camera, reducedMotion, canvasAspect]);

  // The viewport's aspect is also held in React so the chrome can answer the
  // orientation; the rig follows the canvas's own size, which is the truth.
  useEffect(() => {
    void aspect;
  }, [aspect]);

  useFrame((_, delta) => {
    const f = flight.current;
    const c = controls.current;
    if (!c) return;
    if (f) {
      f.elapsed += delta;
      const k = f.seconds === 0 ? 1 : smooth(Math.min(1, f.elapsed / f.seconds));
      camera.position.lerpVectors(f.from.p, new THREE.Vector3(...f.to.position), k);
      c.target.lerpVectors(f.from.t, new THREE.Vector3(...f.to.target), k);
      const persp = camera as THREE.PerspectiveCamera;
      if (persp.isPerspectiveCamera && Math.abs(persp.fov - f.to.fov) > 0.01) {
        persp.fov += (f.to.fov - persp.fov) * (f.seconds === 0 ? 1 : Math.min(1, delta * 4));
        persp.updateProjectionMatrix();
      }
      limits.current = k >= 1 ? f.limits : UNBOUNDED;
      if (k >= 1) flight.current = null;
    }
    applyLimits(c, limits.current);
    c.update();
    reportCamera([
      camera.position.x,
      camera.position.y,
      camera.position.z,
      c.target.x,
      c.target.y,
      c.target.z,
    ]);
  });

  return (
    <OrbitControls
      ref={controls}
      makeDefault
      enablePan={false}
      enableDamping
      dampingFactor={0.08}
    />
  );
}

const smooth = (t: number) => t * t * (3 - 2 * t);

/**
 * Renders nothing; records the moment the **cast** is on screen, which is the
 * first thing the brief's load order cares about. `performance.now()` rather
 * than a wall clock, because what is being measured is an interval within one
 * page's life and nothing here is a device measurement.
 */
function CastReady() {
  const invalidate = useThree((s) => s.invalidate);
  useEffect(() => {
    invalidate();
    const id = requestAnimationFrame(() => {
      (window as Window & { __virgilCastReadyAt?: number }).__virgilCastReadyAt = performance.now();
    });
    return () => cancelAnimationFrame(id);
  }, [invalidate]);
  return null;
}

/** Renders nothing; the verifier waits on the flag it sets. */
function Ready() {
  const invalidate = useThree((s) => s.invalidate);
  useEffect(() => {
    invalidate();
    const id = requestAnimationFrame(() => {
      const w = window as Window & { __virgilRoomReady?: boolean; __virgilRoomReadyAt?: number };
      w.__virgilRoomReady = true;
      w.__virgilRoomReadyAt = performance.now();
    });
    return () => cancelAnimationFrame(id);
  }, [invalidate]);
  return null;
}

const FACE_STATES: readonly FaceState[] = ['idle', 'attentive', 'working', 'passed', 'blocked'];

function query(): URLSearchParams {
  return new URLSearchParams(window.location.hash.split('?')[1] ?? '');
}

function forcedFace(): FaceState | null {
  const value = query().get('state');
  return (FACE_STATES as readonly string[]).includes(value ?? '') ? (value as FaceState) : null;
}

function initialMode(): RunMode {
  if (typeof window === 'undefined') return 'demo';
  return query().get('run') === 'replay' ? 'replay' : 'demo';
}

function initialSpeed(): ReplaySpeed {
  if (typeof window === 'undefined') return DEFAULT_SPEED;
  const value = query().get('speed');
  return (REPLAY_SPEEDS as readonly string[]).includes(value ?? '')
    ? (value as ReplaySpeed)
    : DEFAULT_SPEED;
}

function initialView(): View {
  return query().get('view') === 'room' ? 'room' : 'tabletop';
}

/**
 * `#/?perf=auto|full|reduced|minimal` and `#/?sharp=auto|low|standard|native`.
 * Read once at mount, exactly as every other capture entry point in this file
 * is read, so a frame of the reduced presentation is reachable without
 * pressing anything — which is what the twelve review states require of every
 * one of them.
 */
function initialLevel(): Level | 'auto' {
  if (typeof window === 'undefined') return 'auto';
  const value = query().get('perf');
  return (LEVELS as readonly string[]).includes(value ?? '') ? (value as Level) : 'auto';
}

function initialSharpness(): Sharpness {
  if (typeof window === 'undefined') return 'auto';
  const value = query().get('sharp');
  return ['low', 'standard', 'native'].includes(value ?? '') ? (value as Sharpness) : 'auto';
}

/**
 * `#/?defer=1` splits the scene into two Suspense boundaries so the load-order
 * experiment above can be re-run from the committed artifact. Off by default,
 * and the reason is measured rather than argued (see the comment at the split).
 */
function deferBackdrop(): boolean {
  if (typeof window === 'undefined') return false;
  return query().get('defer') === '1';
}

/** `#/?win=virgil|fabricator|prover|keeper` opens that window at mount. */
function initialWindow(): WindowTarget | null {
  if (typeof window === 'undefined') return null;
  const value = query().get('win');
  if (value === null) return null;
  return ['virgil', 'fabricator', 'prover', 'keeper'].includes(value)
    ? { agent: value as Agent }
    : null;
}

/**
 * `#/?motion=reduce` is the reduced-motion presentation's own entry point.
 * The media query is still read first and still wins when it is set; this is
 * for a capture, and for an owner who wants to see what the setting does
 * without changing his phone's settings to find out.
 */
function forcedReducedMotion(): boolean {
  if (typeof window === 'undefined') return false;
  return query().get('motion') === 'reduce';
}

/** `#/?hold=1`, read with the second and the loop the demo parameters name. */
function holdAt(): { t: number; loop: number } | null {
  if (typeof window === 'undefined') return null;
  if (query().get('hold') !== '1') return null;
  return demoStart();
}

function initialFocus(): MobileFocus {
  const cam = query().get('cam');
  if (cam === 'virgil' || cam === 'board' || (ROLES as readonly string[]).includes(cam ?? ''))
    return cam as MobileFocus;
  /**
   * `#/?win=<agent>` also takes the camera there, so the entry point produces
   * the same state a tap produces rather than a window hanging over an
   * overview. It is the reader's own decision of §5b — *"the panel opens up so
   * you can see it instantly, while you are being taken there"* — expressed as
   * a URL.
   */
  const win = query().get('win');
  if (win === 'virgil' || (ROLES as readonly string[]).includes(win ?? ''))
    return win as MobileFocus;
  return 'all';
}

/** The viewport's aspect. V11 fills the viewport: there is no footer strip to subtract. */
function viewportAspect(): number {
  if (typeof window === 'undefined') return 16 / 9;
  return window.innerWidth / Math.max(1, window.innerHeight);
}

function registerRenderer(gl: THREE.WebGLRenderer): boolean {
  const context = gl.getContext();
  const debug = context.getExtension('WEBGL_debug_renderer_info');
  const renderer = debug
    ? String(context.getParameter(debug.UNMASKED_RENDERER_WEBGL))
    : 'unknown renderer';
  const w = window as Window & { __virgilRenderer?: string; __virgilSoftware?: boolean };
  w.__virgilRenderer = renderer;
  const software = /swiftshader|llvmpipe|software/i.test(renderer);
  w.__virgilSoftware = software;
  return software;
}
