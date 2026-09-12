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
import { forgetSecret, rememberSecret, storedSecret } from '../live/liveSession.js';
import {
  type Live,
  liveIsCompiledIn,
  rememberBranch,
  rememberedBranch,
  reportIsCurrent,
  useLive,
} from '../live/liveState.js';
import type { SlabName } from '../panel/panelContent.js';
import { demoSnapshot, publishDemoState, publishNothingRead } from '../panel/panelStore.js';
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
  stepFor,
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
 *     important screen carries a 48 px target (`TouchTargets.tsx`), one tap
 *     flies the camera to that station and a second tap opens its record — the
 *     owner's decision of 10 September, `stepFor` in `composition.ts` — and
 *     there is one obvious way back;
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
 * **The travel is now the whole of the first tap**, and nothing waits on it.
 * Stage 1 opened the record `FLIGHT_SECONDS * 1000 + 120` ms after the press;
 * stage 3 opened it in the same event, under the owner's decision of 8
 * September; his decision of 10 September separates them into two taps
 * (`selectAnchor`, below, and `stepFor` in `mobile/composition.ts`). The travel
 * itself has never changed. There is still no timer anywhere in the path: the
 * second tap opens the window in its own event, from data.
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
   * **The hosted build's third source.** `useLive` is compiled to nothing in the
   * Owner Build (`world/live/liveState.ts`), so this is a constant `null` there
   * and the file still makes no request of any kind. In the hosted build it
   * reads `/api/state` and keeps reading while the page is open.
   */
  /**
   * **Which branch the room is showing — slice five.**
   *
   * Until now the app read one branch, named by `GITHUB_BRANCH` in the hosting
   * settings, and nothing else. That took the whole site down three times in one
   * day, each time because a branch was merged and deleted and the name in that
   * settings box still pointed at it — on a repository where deleting a merged
   * branch is the normal end of a slice.
   *
   * The choice now lives here, remembered in the browser so it survives a
   * reload, and `null` means whatever the endpoint's own default is. Nothing is
   * written to the server, so what one person looks at changes nothing for
   * anybody else.
   */
  const [branch, setBranch] = useState<string | null>(() =>
    mode === 'live' ? rememberedBranch() : null,
  );
  const live = useLive(mode === 'live', branch);
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
   * **Tapping a station is two steps, and this pass reverses the owner's own
   * earlier decision on his own instruction, recorded rather than quietly
   * changed.**
   *
   * Stage 1 built the brief's stage-1 line — *"tapping triggers a deliberate
   * camera transition before the interface opens"* — as a 1.02 s delay before
   * the record appeared. Stage 3 replaced that with one tap doing both
   * concurrently, on his decision of 8 September (§5b), taken from a
   * description. He has now used it, and on 10 September decided against it:
   * *"When you click each agent, the window opens straight away… What should
   * happen when you click them is first zoom in to their close up view. And
   * THEN when you click their screen, that's when it should open the window."*
   * (`docs/process/OWNER_DECISIONS_2026-09-10.md` item 9, and §5c of the
   * interface record, which supersedes §5b rather than deleting it.)
   *
   * So the rule lives in `stepFor` (`mobile/composition.ts`) and this is the
   * one place that applies it: the first tap travels, the second opens, and the
   * second never moves the camera. Two things it deliberately does not change,
   * because he named them as what must survive:
   *
   *  - **The window still renders from data and never waits for a frame**
   *    (`window/AgentWindow.tsx`). Nothing here defers it — when it opens, it
   *    opens in the same event as the press.
   *  - **`wasTap()` still guards every press**, so a drag still opens nothing
   *    and still travels nowhere.
   *
   * `verify:owner:v11` drives both presses at three viewports and measures each
   * step separately, so the check and the interaction changed together.
   */
  const lastSelection = useRef({ id: '', at: 0 });
  /**
   * Sets the window without moving the camera. The deliberate, labelled way in
   * — the `TALK TO VIRGIL` control — and the in-window jump between agents.
   */
  const openWindow = (id: string, target: WindowTarget) => {
    // Where the character's display is on screen at the moment of the tap, so
    // the window can expand out of it rather than appear over it.
    const projected = projections()[id];
    setOrigin(projected && projected.visible ? { x: projected.x, y: projected.y } : null);
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
    const now = performance.now();
    // The world's own raycast handler and this layer's hit test can both
    // answer one press. Whichever arrives first wins; the other is ignored.
    // **This matters more than it did**: with two steps, a press counted twice
    // would travel and open at once, which is precisely the behaviour the
    // owner asked to be rid of.
    if (lastSelection.current.id === id && now - lastSelection.current.at < 700) return;
    lastSelection.current = { id, at: now };
    const step = stepFor(anchor, focus);
    setFocus(step.focus);
    if (step.window === null) {
      setWin(null);
      return;
    }
    // A ledger row opens that hop's own agent, which is the owner's decision
    // of 8 September: the row carries shape and colour at distance and the
    // window carries the whole of it.
    openWindow(
      anchor.id,
      row === undefined
        ? step.window
        : windowForLedgerRow(demoSnapshot() ?? demoAt(0, 0, false), row),
    );
  };
  /**
   * The same two steps from the keyboard, which is the hidden menu's own path
   * and not the product's.
   *
   * It clears the repeat guard first, and that is not a loophole: the guard
   * exists because one *press* can be answered twice, by the world's raycast
   * and by the DOM hit test at once. A keystroke has one handler and cannot be
   * doubled, so leaving the guard in its way would only make the second press
   * of `2` do nothing for 700 ms — which is a version of exactly the thing this
   * pass is removing.
   */
  const selectByKey = (id: string) => {
    lastSelection.current = { id: '', at: 0 };
    selectAnchor(id);
  };
  /**
   * Another agent's window, without going back to the world first.
   *
   * **This one still moves the camera, and that is not the two-step rule being
   * broken.** The reader is inside a window and has pressed a control that
   * names where it goes — *"Read the review"* — so the destination was asked
   * for in words, not guessed from a tap on the world; and when the window is
   * dismissed the world behind it has to be the station whose record was open,
   * or `back` would be lying about where it goes.
   */
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
      if (event.key === '1') selectByKey('virgil');
      else if (event.key === '2') selectByKey('fabricator');
      else if (event.key === '3') selectByKey('prover');
      else if (event.key === '4') selectByKey('keeper');
      else if (event.key === '5') selectByKey('board-verdict');
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
                  live={live}
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
                live={live}
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
          {/*
           * **The second step, said once, where the reader is standing.**
           *
           * With one tap there was nothing to discover. With two there is: a
           * reader who has just been flown to a station has no way of knowing
           * that another tap opens the record, and a phone has no hover to tell
           * him. §5b asked for a persistent cue on the screens themselves; this
           * is the cheap version of that — one line, in the world's own ice
           * rather than a colour that claims something is wrong, present only
           * at a station with nothing open, and carrying no action, so it is
           * not a touch target.
           *
           * **This is the coordinator's judgment, not the owner's
           * instruction**, in the same class as the version marker. Deleting
           * this one element is the whole of removing it.
           */}
          <StepHint shown={showBack} />
          <DevEntry open={dev} onToggle={() => setDev((value) => !value)} />
          {mode === 'live' && !live.state ? (
            <p className="v11-live-notice" role="status">
              {live.error
                ? `This repository could not be read. ${live.error}`
                : live.answer?.branchExists === false
                  ? /**
                     * **Not "reading…", which is what this said.** Since KP8-02
                     * there is a third case: the read succeeded and the branch is
                     * not there, so no world is drawn — and a notice saying the
                     * page is still reading would be waiting for something that
                     * is never going to arrive. The branch list beside this says
                     * which branch and offers the ones that exist.
                     */
                    `Nothing is shown for ${live.answer.branch}: that branch is not in this repository. Choose another above.`
                  : 'Reading this repository…'}
            </p>
          ) : null}
          <DemoBadge
            mode={mode}
            speed={speed}
            live={live}
            open={badgeOpen}
            onToggle={() => setBadgeOpen((value) => !value)}
          />
          {mode === 'live' ? (
            <BranchList
              live={live}
              showing={live.answer?.branch ?? branch}
              onChoose={(name) => {
                setBranch(name);
                rememberBranch(name);
              }}
            />
          ) : null}
          <PerformanceNotice level={level} forced={forcedLevel !== 'auto'} />
          {/*
           * **The one control that still opens a window in a single press, and
           * it says so on its face.** The owner's objection was to a tap on a
           * character doing two things at once and leaving him somewhere he had
           * not asked to be. A control labelled `TALK TO VIRGIL` is a request in
           * words: pressing it can hold no surprise. So it opens the
           * conversation immediately — and, unlike before, **it does not move
           * the camera**, so dismissing the conversation puts the reader back
           * exactly where he was rather than at a close-up he never asked for.
           */}
          <TalkBar
            marker={`V11 · stage 4 · ${build.shortSha}`}
            onTalk={() => openWindow('virgil', { agent: 'virgil' })}
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

/**
 * The second step, named. Shown under exactly the same condition as the way
 * back — at a station, with no window over it — because those are precisely the
 * moments when another tap does something the reader cannot see.
 */
function StepHint({ shown }: { shown: boolean }) {
  if (!shown) return null;
  return (
    <p className="v11-step-hint" role="status">
      Tap again to open
    </p>
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
      aria-label="Developer settings"
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

/**
 * **Every branch, and which one the room is showing — Phase 2, slice five.**
 *
 * The owner's instruction of 2026-09-11: *"I want the app to show me live work
 * and what's being built right now as well as the state of what's been merged.
 * It's meant to show everything."* Of three ways to do it he chose the first:
 * one list, one branch in the room at a time, a tap to change which.
 *
 * Three rules it keeps, all of them the same rule.
 *
 *  - **A row never says more than was read.** `/branches` carries no commit
 *    dates and there is no single call that does, so a branch's time is known
 *    only where it has an open pull request to read it from. A row without one
 *    says nothing about when it last moved rather than guessing from its
 *    position in a list.
 *  - **A list that was cut says it was cut.** Eight branches are carried; if
 *    more exist, the count of what exists is on screen. A list silently
 *    truncated is a list lying about what a repository has.
 *  - **"Not read" is not "none".** A list that could not be read says so and
 *    says why; it does not draw as a repository with no branches.
 *
 * And the branch the room is showing is the branch the answer *says* it is —
 * `live.answer.branch`, not what was asked for. Those differ for the length of
 * one read after a tap, and drawing the asked-for name over the previous
 * branch's commits is precisely the confusion this whole build exists to avoid.
 */
function BranchList({
  live,
  showing,
  onChoose,
}: {
  live: Live;
  showing: string | null;
  onChoose: (name: string | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const answer = live.answer;
  const branches = answer?.branches ?? null;
  const gone = answer?.branchExists === false;
  const total = answer?.branchesTotal ?? 0;
  const watched = answer?.branchesWatched ?? 0;
  const more = total > watched ? total - watched : 0;

  // Nothing to offer and nothing to explain: an answer from before this slice,
  // or one that never arrived. The room is the room; this adds no furniture to
  // say it has nothing to say.
  if (!answer || (branches === null && !answer.branchesReason && !gone)) return null;

  return (
    <div className={`v11-branches${open ? ' is-open' : ''}`}>
      <button
        type="button"
        className={`v11-branch-toggle${gone ? ' is-gone' : ''}`}
        data-touch-target="branches"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <span className="v11-branch-label">Branch</span>
        <span className="v11-branch-name">{showing ?? '—'}</span>
        <span className="v11-branch-more" aria-hidden="true">
          {open ? '×' : '▾'}
        </span>
      </button>

      {gone ? (
        /**
         * **The failure that took this site down three times in one day, now a
         * sentence instead of a dead page.** A merged branch is deleted, the
         * name written in the hosting settings still points at it, and every
         * read 422s. The list beside this message is the way out, which is the
         * whole reason the endpoint reads the list before it reads the branch.
         */
        <p className="v11-branch-gone" role="status">
          <strong>{answer.branch}</strong> is not in this repository any more — most likely merged
          and deleted. Nothing is being shown for it, which is not the same as nothing having
          happened on it. Choose another branch below.
        </p>
      ) : null}

      {open || gone ? (
        <div className="v11-branch-panel">
          {branches === null ? (
            <p className="v11-branch-note" role="status">
              {answer.branchesReason ??
                'The branch list could not be read, so this cannot say which branches exist.'}
            </p>
          ) : (
            <>
              <ul className="v11-branch-rows">
                {branches.map((entry) => {
                  const isShowing = entry.name === showing && !gone;
                  return (
                    <li key={entry.name}>
                      <button
                        type="button"
                        className={`v11-branch-row${isShowing ? ' is-showing' : ''}`}
                        data-touch-target={`branch-${entry.name}`}
                        aria-current={isShowing ? 'true' : undefined}
                        onClick={() => {
                          /**
                           * **The Keeper's KP8-04.** This sent `null` for the
                           * default branch, meaning "omit the parameter" — and
                           * the endpoint resolved an omitted parameter to
                           * `GITHUB_BRANCH` before the repository's default. So
                           * tapping `main` asked for whatever that hosting
                           * setting named, which on this deployment is a deleted
                           * branch. The row that answers "the state of what's
                           * been merged" went somewhere else, every time.
                           *
                           * A row now sends its own name. What the row says is
                           * what is asked for, with nothing in between to
                           * disagree with it.
                           */
                          onChoose(entry.name);
                          setOpen(false);
                        }}
                      >
                        <span className="v11-branch-row-name">{entry.name}</span>
                        <span className="v11-branch-row-what">
                          {entry.isDefault
                            ? 'merged'
                            : entry.pull
                              ? entry.pull.draft
                                ? `draft pull request #${entry.pull.number}`
                                : `pull request #${entry.pull.number}`
                              : 'no pull request'}
                        </span>
                        <span className="v11-branch-row-sha">{entry.shortSha ?? '—'}</span>
                        <span className="v11-branch-row-when">
                          {/*
                           * Only where it is known. A branch with no pull
                           * request has no time on this wire, and "not read" is
                           * what it gets — never a guess, and never the blank
                           * that would read as "just now".
                           */}
                          {entry.updatedAt
                            ? readClock(entry.updatedAt)
                            : 'when it last moved: not read'}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
              <p className="v11-branch-note">
                {more > 0
                  ? `Showing ${branches.length} of ${total} branches, the default first and then the ones with a pull request. ${more} more exist and are not listed.`
                  : `All ${total} branch${total === 1 ? '' : 'es'} in this repository.`}{' '}
                A branch's time is known only where it has a pull request to read it from, so the
                others say so rather than guessing.
              </p>
            </>
          )}
        </div>
      ) : null}
    </div>
  );
}

function DemoBadge({
  mode,
  speed,
  live,
  open,
  onToggle,
}: {
  mode: RunMode;
  speed: ReplaySpeed;
  live: Live;
  open: boolean;
  onToggle: () => void;
}) {
  const recorded = mode === 'replay';
  const isLive = mode === 'live';
  return (
    <div className={`v11-badge-dock${open ? ' is-open' : ''}`}>
      <button
        type="button"
        className={`v11-badge${recorded ? ' is-recorded' : ''}${isLive ? ' is-live' : ''}`}
        data-touch-target="badge"
        aria-expanded={open}
        aria-label={
          isLive
            ? 'Live state — what it shows'
            : recorded
              ? 'Recorded example — what it shows'
              : 'Demo information — what it means'
        }
        onClick={onToggle}
      >
        <span className="v11-badge-dot" aria-hidden="true" />
        <span className="v11-badge-word">
          {isLive ? 'This repository' : recorded ? 'Recorded run' : 'Demo data'}
        </span>
        <span className="v11-badge-more" aria-hidden="true">
          {open ? '×' : 'i'}
        </span>
      </button>
      {open ? (
        <p
          className={`v11-badge-body${recorded ? ' is-recorded' : ''}${isLive ? ' is-live' : ''}`}
          role="status"
        >
          {recorded ? (
            <>
              This is the Phase 0 consolidation, a run that really happened, replayed at{' '}
              {compressionOf(speed)}×. It began {recordedClock(RUN.startedAt)} and ran{' '}
              {recordedDuration(RUN_SECONDS)}. The change 3b9a964e was reviewed, passed with
              non-blocking findings and went into the project as {RUN.mergeSha.slice(0, 7)}. Every
              figure is read out of this repository's own record. It already happened; none of it is
              live.
            </>
          ) : isLive ? (
            <>
              This is {live.answer?.repo ?? 'this repository'}, branch {live.answer?.branch ?? '—'},
              read from GitHub {live.asOf ? readClock(live.asOf) : 'never yet'}. The branch, the
              commit and the check results come from GitHub, which no session can write to. {/**
               * **KP2-16: the sentence above names three things and the screen
               * drew two.** The check results were read by `state.mjs`, returned
               * in the answer, and displayed nowhere — so the claim was true of
               * the data and false of the screen, which is the same defect as a
               * screen showing what it never read, pointing the other way.
               *
               * They are drawn here rather than on the Prover's console because
               * the console's `Check` is a playback shape — a start time and a
               * duration — and GitHub returns neither. Putting live results
               * through it would mean inventing the timing, which is the thing
               * this project exists not to do. A count and a source are what was
               * actually read, so a count and a source are what it says.
               */}
              {live.answer?.checks ? (
                <>
                  Of {live.answer.checks.total} check
                  {live.answer.checks.total === 1 ? '' : 's'} on this commit,{' '}
                  {live.answer.checks.passed} passed, {live.answer.checks.failed} failed,{' '}
                  {live.answer.checks.running} still running and {live.answer.checks.noResult}{' '}
                  returned no result. A check that has not finished is not a pass.{' '}
                </>
              ) : isLive ? (
                <>
                  The check results could not be read this time, so none are shown — not zero, which
                  would be a different claim.{' '}
                </>
              ) : null}
              {live.answer?.sessionReport &&
              reportIsCurrent(live.answer.sessionReport.reportedAt) &&
              live.answer.sessionReport.branch !== live.answer.branch ? (
                /**
                 * **KP4-04.** The room drops a report about another branch —
                 * `stateFromAnswer` compares the two and draws nobody working —
                 * and this paragraph tested freshness alone. So a fresh report
                 * naming a different branch produced *"Who is working comes from
                 * the agents' own report"* over a room in which nobody was
                 * working: the prose describing a rule the code beside it does
                 * not follow, which is the same defect as a screen inventing a
                 * number, one layer up.
                 */
                <>
                  A session did write a report {readClock(live.answer.sessionReport.reportedAt)},
                  but it is about branch {live.answer.sessionReport.branch}, and this is{' '}
                  {live.answer.branch ?? '—'}. It is not drawn here: a report about one branch says
                  nothing about another, and showing it would put that session's work on this
                  branch's room.
                </>
              ) : live.answer?.sessionReport &&
                reportIsCurrent(live.answer.sessionReport.reportedAt) ? (
                <>
                  Who is working comes from the agents’ own report in{' '}
                  <code>.virgil/state.json</code>
                  {live.answer.sessionReportedIn
                    ? `, committed as ${live.answer.sessionReportedIn.slice(0, 7)}`
                    : ''}
                  , written {readClock(live.answer.sessionReport.reportedAt)}. That is their word
                  for it, not proof — you can open the file and read exactly what this screen is
                  drawing.
                </>
              ) : live.answer?.sessionReport ? (
                <>
                  The agents’ last report was written{' '}
                  {readClock(live.answer.sessionReport.reportedAt)} and has gone cold, so nobody is
                  shown working. This app cannot see an agent by itself; it knows only what a
                  session last wrote down, and a report left standing would look exactly like one
                  still true.
                </>
              ) : live.answer?.sessionReportStatus === 'refused' ||
                live.answer?.sessionReportStatus === 'unreadable' ? (
                /**
                 * **KP4-03.** A report the wire check refuses arrives as
                 * `sessionReport: null` with a reason beside it, and fell to the
                 * branch below — which announced that no session had written a
                 * report and then printed the reason one had been refused, in
                 * the same sentence. Two statements about one fact, and the
                 * first of them false.
                 */
                <>
                  A session did write a report and this build{' '}
                  {live.answer.sessionReportStatus === 'refused'
                    ? 'refused it'
                    : 'could not read it'}
                  , so nobody is shown working: {live.answer.sessionReportReason} Nothing is being
                  guessed at in its place — a report that cannot be read is not the same as no
                  report, and neither is drawn as work.
                </>
              ) : (
                <>
                  No session has written a report, so nobody is shown working. {/**
                   * **KP5-08(c).** This branch stopped carrying the reason when
                   * the status field was added, which is right while both ship
                   * from the same commit — and this function and this page are
                   * separate artefacts that need not. An older function in front
                   * of a newer page sends a refusal with no status, and without
                   * this the page would state flatly that nobody wrote one.
                   */}
                  {live.answer?.sessionReportReason ?? ''}
                </>
              )}{' '}
              {live.error ? `Last attempt: ${live.error}` : ''}
            </>
          ) : (
            <>
              This is a demonstration. Nothing you see here comes from a real project: no work has
              been done, no check has been run, and nothing is connected.
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
/**
 * **Where the owner gives this page the secret that lets it start work.**
 *
 * Phase 2 slice three. `/api/instruct` will not start a run without the shared
 * secret, and the secret cannot be built into the page: anything the bundle
 * carries, anyone who opens the page can read. So he types it once, here, and it
 * is kept in this browser's local storage and nowhere else — not in the
 * repository, not in the build, and in no answer this app returns.
 *
 * It lives behind the development menu rather than in the ordinary interface
 * because it is a one-time setup step, not a feature. **Forget** is beside it,
 * because a secret that can be given and not taken back is a trap.
 */
function InstructSecret() {
  const [value, setValue] = useState('');
  const [held, setHeld] = useState(() => storedSecret() !== null);
  if (!liveIsCompiledIn()) return null;
  return (
    <div className="v11-dev-row v11-dev-secret">
      <span className="v11-dev-label">Instruct</span>
      {held ? (
        <>
          <span className="v11-dev-fine">This device can start sessions.</span>
          <button
            type="button"
            onClick={() => {
              forgetSecret();
              setHeld(false);
            }}
          >
            Forget
          </button>
        </>
      ) : (
        <>
          <input
            type="password"
            className="v11-dev-input"
            value={value}
            placeholder="Your instruct secret"
            aria-label="The secret that lets this device start sessions"
            onChange={(event) => setValue(event.target.value)}
          />
          <button
            type="button"
            disabled={value.trim().length === 0}
            onClick={() => {
              rememberSecret(value);
              setValue('');
              setHeld(storedSecret() !== null);
            }}
          >
            Keep
          </button>
        </>
      )}
    </div>
  );
}

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
    <div className="v11-dev-panel" role="dialog" aria-label="Developer settings">
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
      <InstructSecret />
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
          title="The old room is no longer used, but it has been kept."
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
                ? 'First check whether the device runs the scene smoothly. Lower the visual quality only if it struggles.'
                : LEVEL_PLANS[option].note
            }
          >
            {option === 'auto' ? 'Auto' : LEVEL_PLANS[option].label}
          </button>
        ))}
      </div>
      <p className="v11-dev-keys">
        Now: <code>{level}</code> on a <code>{tier}</code> device (detected{' '}
        <code>{detectedTier}</code>), loop <code>{loop}</code>, screens ×
        <code>{LEVEL_PLANS[level].redrawScale}</code>. Governor:{' '}
        {governor.lastMeanMs > 0
          ? `${governor.lastMeanMs} ms a frame. `
          : 'No performance test has run yet. '}
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
        Keys: 1–4 the cast, 5 the board — once to travel there, again to open the record; 0 or Esc
        the overview, D this menu. Drag to look around; pinch or scroll to move closer. Ordinary
        navigation does not need any of it.
      </p>
      {/*
       * **V10 is one press away, and since 10 September that matters more than
       * it did.** The owner made V11 the version he opens
       * (`docs/process/OWNER_DECISIONS_2026-09-10.md` item 2) on the condition
       * that V10 stays reachable and unchanged. It was reachable before only by
       * typing `#/v10` into an address bar, which on the phone this build is
       * for means a keyboard and an exact string. The route, the component and
       * V10's own footer are all untouched: this is a link to them.
       */}
      <p className="v11-dev-keys">
        <a className="v11-dev-link" href="#/v10">
          Open V10
        </a>{' '}
        — unchanged, in this same file, at <code>#/v10</code>. The rejected Phase 0 spikes are at{' '}
        <code>#/spike/foundry</code> and <code>#/spike/mind</code>.
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
  live,
  focus,
  orientation,
  onSelect,
}: {
  demo: boolean;
  mode: RunMode;
  speed: ReplaySpeed;
  live: Live;
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
  /**
   * **In live mode the world draws nothing until something has been read.**
   *
   * The alternative was to fall back to the at-rest scripted state, and that is
   * a lie with a specific shape: `screens/candidate.ts` supplies a data-shaped
   * identifier when none is set, so a live page that had read nothing would draw
   * `9abcdef` beside a real branch name and look exactly like a page that had.
   * The same trap the Keeper's KS4-04 caught in the replay. So `null` here, and
   * the DOM says what happened instead.
   */
  const state = forced ? forcedState(forced) : mode === 'live' ? live.state : (frozen ?? running);
  if (!state) {
    /**
     * **`KP10-13`.** This returned here and left the store holding whatever it
     * held last — which, on a page that had never had a live state, is the
     * recording's first frame. The world was correctly absent; the window one
     * press away was narrating a scripted run in Virgil's voice.
     *
     * Saying so is the repair. A surface handed nothing draws nothing.
     */
    publishNothingRead();
    return null;
  }
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
          "Visual quality is already reduced" at the middle rung. It says *who chose this*,
          so the verb is now the governor's action rather than the rung's
          own name: "Visual quality reduced", "Visual quality set to minimum".
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

/**
 * **What the page opens on.**
 *
 * The Owner Build opens on the scripted demonstration, as it always has;
 * `__LIVE__` is false there and this cannot return `live`. The hosted build
 * opens on **this repository's real state**, which is the whole point of Phase 2
 * slice one, and `#/?run=demo` and `#/?run=replay` still reach the other two so
 * that the recording stays one press away — it is the thing that shows what a
 * full run looks like, and a real repository is usually quiet.
 */
/**
 * **How long ago the state was read, in words rather than a timestamp.**
 *
 * A page showing a state is claiming the state is current, and the only honest
 * version of that claim carries its age. Seconds are rounded down, never up: a
 * reading is never made to sound fresher than it is.
 */
function readClock(iso: string): string {
  const at = Date.parse(iso);
  if (Number.isNaN(at)) return 'at a time it did not record';
  const seconds = Math.floor((Date.now() - at) / 1000);
  if (seconds < 0) return 'just now';
  if (seconds < 60) return `${seconds} second${seconds === 1 ? '' : 's'} ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? '' : 's'} ago`;
  const hours = Math.floor(minutes / 60);
  return `${hours} hour${hours === 1 ? '' : 's'} ago`;
}

function initialMode(): RunMode {
  if (typeof window === 'undefined') return 'demo';
  const asked = query().get('run');
  if (asked === 'replay') return 'replay';
  if (asked === 'demo') return 'demo';
  return liveIsCompiledIn() ? 'live' : 'demo';
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
   * `#/?win=<agent>` also takes the camera there, and it still does under the
   * two-step rule. **A URL is not a tap.** It names one state outright — this
   * reader, at this station, with this record open — which is exactly the state
   * the two taps arrive at, so the entry point lands on the end of the path
   * rather than skipping a step of it. It is what makes the twelve review
   * states reproducible from a string, and it is the only reason the second
   * step did not force those frames to be recaptured.
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
    : 'Graphics system not recognised';
  const w = window as Window & { __virgilRenderer?: string; __virgilSoftware?: boolean };
  w.__virgilRenderer = renderer;
  const software = /swiftshader|llvmpipe|software/i.test(renderer);
  w.__virgilSoftware = software;
  return software;
}
