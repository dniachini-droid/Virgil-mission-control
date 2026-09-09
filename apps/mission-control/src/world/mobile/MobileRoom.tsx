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
import { Panel } from '../panel/Panel.js';
import type { PanelTarget, SlabName } from '../panel/panelContent.js';
import { publishDemoState } from '../panel/panelStore.js';
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
import { forcedState, type RunMode, useDemo } from '../room/demo.js';
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
import { ScreenBankV11 } from '../screens/v11/ScreenBankV11.js';
import {
  type Anchor,
  backdropFor,
  anchors as buildAnchors,
  type MobileFocus,
  mobilePose,
  orientationFor,
} from './composition.js';
import { type Insets, NO_INSETS, readInsets } from './safeArea.js';
import { setPressed, TouchProjector, TouchTargets, targetAt } from './TouchTargets.js';
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

/** How long the deliberate transition into a selection lasts, in seconds. */
export const FLIGHT_SECONDS = 0.9;
/** And how long after it starts the record opens. Deliberate: the move reads first. */
export const OPEN_AFTER_MS = FLIGHT_SECONDS * 1000 + 120;

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
  const [panel, setPanel] = useState<PanelTarget | null>(null);
  const [dev, setDev] = useState(false);
  const [badgeOpen, setBadgeOpen] = useState(false);
  const [settings] = useState(() => ({
    reducedMotion: prefersReducedMotion(),
    tier: detectTier(),
    autoTravel: false,
    softwareRenderer: false,
  }));
  const [insets, setInsets] = useState<Insets>(NO_INSETS);
  const [aspect, setAspect] = useState(() => viewportAspect());
  const coarse = settings.tier === 'constrained' || settings.tier === 'mobile';
  const anchors = useMemo(() => buildAnchors(), []);
  const orientation = orientationFor(aspect);
  const backdrop = backdropFor(orientation);

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
   * **A tap moves the camera, and the record follows the move.** The brief:
   * *"tapping triggers a deliberate camera transition before the interface
   * opens."* This is the one place V11 departs from V10's behaviour on purpose
   * — V10 opens both in the same event, by the owner's earlier decision, and
   * V10 still does at `#/v10`.
   *
   * With reduced motion there is no transition to wait for, so the record
   * opens at once rather than after a pause that would mean nothing.
   */
  const opening = useRef(0);
  const lastSelection = useRef({ id: '', at: 0 });
  const select = (id: string, to: MobileFocus, target: PanelTarget) => {
    const now = performance.now();
    // The world's own raycast handler and this layer's hit test can both
    // answer one press. Whichever arrives first wins; the other is ignored.
    if (lastSelection.current.id === id && now - lastSelection.current.at < 700) return;
    lastSelection.current = { id, at: now };
    setFocus(to);
    window.clearTimeout(opening.current);
    if (settings.reducedMotion) setPanel(target);
    else {
      setPanel(null);
      opening.current = window.setTimeout(() => setPanel(target), OPEN_AFTER_MS);
    }
  };
  const toOverview = () => {
    window.clearTimeout(opening.current);
    lastSelection.current = { id: '', at: 0 };
    setPanel(null);
    setFocus('all');
  };
  const selectAnchor = (id: string) => {
    const anchor = anchors.find((candidate) => candidate.id === id);
    if (anchor) select(anchor.id, anchor.focus, anchor.panel);
  };

  // What the verifier drives the interface through. Two values and one
  // function; no state is settable from here, so nothing in the product
  // depends on it existing.
  useEffect(() => {
    const w = window as Window & {
      __virgilV11?: { focus: string; panel: string | null; orientation: string };
      __virgilV11Reset?: () => void;
    };
    w.__virgilV11 = { focus, panel: panel ? panel.kind : null, orientation };
    w.__virgilV11Reset = toOverview;
  });

  useEffect(() => () => window.clearTimeout(opening.current), []);

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
  const focused = focus !== 'all' || panel !== null;
  /**
   * **When the way back is shown, and why not always.** In portrait the panel
   * is a full-screen sheet — measured, not assumed: at 390 x 844 it covers the
   * whole viewport including the top-left corner — so a back control underneath
   * it could be pressed by nobody, and one on top of it would sit across the
   * panel's own kicker. The panel's own dismissal leaves the reader at the
   * station, which is the owner's decision from V9 and is not this stage's to
   * overturn; the way home appears the moment the record is closed. Two taps
   * from an open record, one from anywhere else. Stage 3 redesigns the panel
   * and should fold "home" into it.
   */
  const showBack = focus !== 'all' && panel === null;

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
    <SettingsContext.Provider value={settings}>
      <div
        className={`v11-stage${focused ? ' is-focused' : ''}`}
        data-orientation={orientation}
        onPointerDown={onStagePointerDown}
        onPointerUp={onStagePointerUp}
        onPointerCancel={() => setPressed(null)}
      >
        <Canvas
          shadows={!coarse}
          dpr={coarse ? [1, 1.25] : [1, 1.75]}
          gl={{
            antialias: true,
            toneMapping: THREE.ACESFilmicToneMapping,
            toneMappingExposure: 0.92,
            powerPreference: 'high-performance',
          }}
          camera={{ position: start.position, fov: start.fov, near: 0.2, far: 400 }}
          onCreated={({ gl }) => {
            registerRenderer(gl);
          }}
          onPointerMissed={() => undefined}
        >
          <Backdrop view={view} />
          <Suspense fallback={null}>
            <LightingRig view={view} />
            {view === 'room' ? (
              <>
                <RoomShell />
                <WindowView />
                <PortholeFrame />
              </>
            ) : (
              <>
                <Tabletop planetAt={backdrop.planetAt} stationAt={backdrop.stationAt} />
                <FloorSheen />
              </>
            )}
            <Orrery />
            <Cast demo={demo} mode={mode} speed={speed} focus={focus} onSelect={selectAnchor} />
            <Ready />
          </Suspense>
          <Rig focus={focus} aspect={aspect} />
          <TouchProjector anchors={anchors} />
          {coarse ? null : <Post view={view} />}
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
          <TalkBar
            marker={`V11 · stage 2 · ${build.shortSha}`}
            onTalk={() =>
              select('virgil', 'virgil', {
                kind: 'slab',
                slab: 'verdict',
              })
            }
          />
          {dev ? (
            <DevPanel
              build={build}
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
                window.clearTimeout(opening.current);
                setPanel(null);
                setFocus(next);
              }}
              onClose={() => setDev(false)}
            />
          ) : null}
        </div>

        <Panel target={panel} onClose={() => setPanel(null)} />
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
  onSelect: (id: string) => void;
}) {
  const forced = forcedFace();
  const scripted = useDemo(demo && forced === null && mode === 'demo');
  const replayed = useReplay(demo && forced === null && mode === 'replay', speed);
  const running = mode === 'replay' ? replayed : scripted;
  const state = forced ? forcedState(forced) : running;
  publishDemoState(state);
  const virgilBusy = state.pose !== 'rest' || state.virgilFace !== 'idle';
  return (
    <>
      <VirgilConsole active={virgilBusy && !state.content.ownerGate} />
      <VirgilRigged pose={state.pose} face={state.virgilFace} onSelect={() => onSelect('virgil')} />
      <ScreenBankV11
        content={state.content}
        outcome={state.outcome}
        seconds={state.seconds}
        mode={state.mode}
        speed={speed}
        onOpen={(slab: SlabName) => onSelect(`board-${slab}`)}
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
              quiet={state.content.ownerGate ? 0.75 : 0}
              attention={focus === role}
              onOpen={() => onSelect(`${role}-screen`)}
            />
            <StationLight role={role} activity={member.activity} report={member.report} />
          </group>
        );
      })}
    </>
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
    maxPolarAngle: polar + 0.18,
    minAzimuthAngle: azimuth - Math.PI / 5,
    maxAzimuthAngle: azimuth + Math.PI / 5,
    minDistance: distance * 0.68,
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

/** Renders nothing; the verifier waits on the flag it sets. */
function Ready() {
  const invalidate = useThree((s) => s.invalidate);
  useEffect(() => {
    invalidate();
    const id = requestAnimationFrame(() => {
      (window as Window & { __virgilRoomReady?: boolean }).__virgilRoomReady = true;
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

function initialFocus(): MobileFocus {
  const cam = query().get('cam');
  if (cam === 'virgil' || cam === 'board' || (ROLES as readonly string[]).includes(cam ?? ''))
    return cam as MobileFocus;
  return 'all';
}

/** The viewport's aspect. V11 fills the viewport: there is no footer strip to subtract. */
function viewportAspect(): number {
  if (typeof window === 'undefined') return 16 / 9;
  return window.innerWidth / Math.max(1, window.innerHeight);
}

function registerRenderer(gl: THREE.WebGLRenderer) {
  const context = gl.getContext();
  const debug = context.getExtension('WEBGL_debug_renderer_info');
  const renderer = debug
    ? String(context.getParameter(debug.UNMASKED_RENDERER_WEBGL))
    : 'unknown renderer';
  const w = window as Window & { __virgilRenderer?: string; __virgilSoftware?: boolean };
  w.__virgilRenderer = renderer;
  w.__virgilSoftware = /swiftshader|llvmpipe|software/i.test(renderer);
}
