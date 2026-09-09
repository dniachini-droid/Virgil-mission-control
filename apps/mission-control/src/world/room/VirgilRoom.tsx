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
import { type ComponentRef, Suspense, useEffect, useRef, useState } from 'react';
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
import { ConsoleScreen } from '../screens/ConsoleScreen.js';
import { setBandOnTwoLines, setBandReplay } from '../screens/draw.js';
import { ScreenBank } from '../screens/ScreenBank.js';
import { CAST, ROLES, type Role } from './cast.js';
import { closeUpPose } from './closeUp.js';
import { forcedState, type RunMode, useDemo } from './demo.js';
import { FloorSheen } from './FloorSheen.js';
import { reportCamera, watchGestures } from './gesture.js';
import { LightingRig } from './LightingRig.js';
import { PortholeFrame, Station, StationLight, VirgilConsole } from './Models.js';
import { Orrery } from './Orrery.js';
import { type CameraPose, layout, room, tabletopCamera } from './palette.js';
import { RoomShell } from './RoomShell.js';
import { Tabletop } from './Tabletop.js';
import { WindowView } from './WindowView.js';

/**
 * Virgil and his cast on the tabletop (`docs/process/PHASE_1_STYLISED_SPEC.md`
 * §2, as amended for V7):
 *
 *  - **the tabletop** — the presentation. A disc with a visible edge, no
 *    walls, no window (V8), the nebula with stars and grain as the
 *    backdrop, the three consoles symmetrical behind Virgil's, a camera
 *    almost level with the characters on a 120° arc (`tabletopCamera`);
 *  - **the room** — **retired, not removed.** The owner: "Room retired for
 *    now. No window. I might go back to it. But for the time being, we
 *    proceed with tabletop." Its code stays, reachable behind the `V` key
 *    and `#/?view=room`, so that going back costs nothing; it is not the
 *    default and is not offered for judgement.
 *
 * Selecting a character — a click, or `1`–`4` — drops the camera to near
 * their eye level with their console's screen beside them; `5` looks at
 * Virgil's three slabs; `Esc` or `0` returns. The demonstration is
 * scripted and says so on every surface.
 *
 * Nothing here is a measurement of performance or of how it looks; the
 * container this is built in renders in software and misrepresents bloom
 * and colour. The owner's machine is the only display this project has.
 */
export type View = 'room' | 'tabletop';
export type Focus = 'all' | 'virgil' | 'board' | Role;

export function VirgilRoom() {
  const [demo, setDemo] = useState(true);
  /**
   * **Which of the two things is running** (V10).
   *
   * `demo` is the scripted thirty-second loop of invented content, which
   * teaches how the system works. `replay` is the Phase 0 consolidation —
   * a run that actually happened — played back faster than it happened,
   * with every figure read out of the repository's committed record. The
   * scripted demonstration stays: this is a second mode, not a
   * replacement.
   *
   * The two make **opposite claims about their own truthfulness**, so
   * nothing may be ambiguous about which is on. The honesty band's words
   * change on every screen and slab, the badge changes and changes
   * colour, and the panel's band changes with them.
   */
  const [mode, setMode] = useState<RunMode>(() => initialMode());
  const [speed, setSpeed] = useState<ReplaySpeed>(() => initialSpeed());
  const [view, setView] = useState<View>(() => initialView());
  const [focus, setFocus] = useState<Focus>(() => initialFocus());
  /**
   * Which screen's full record is open, if any (V9). **The tap does two
   * things at once** — the owner's decision, against this session's earlier
   * recommendation: *"tapping a screen opens the panel straight away and
   * takes you there — but the panel opens up so you can see it instantly,
   * while you are being taken there."* So `open` sets both, in one event,
   * and the panel renders from data while the camera flies underneath it.
   * Closing the panel clears only the panel: the reader is left at the
   * station, never snapped back.
   */
  const [panel, setPanel] = useState<PanelTarget | null>(null);
  const open = (target: PanelTarget, to: Focus) => {
    setPanel(target);
    setFocus(to);
  };
  const [settings] = useState(() => ({
    reducedMotion: prefersReducedMotion(),
    tier: detectTier(),
    autoTravel: false,
    softwareRenderer: false,
  }));
  const coarse = settings.tier === 'constrained' || settings.tier === 'mobile';
  /*
   * **The honesty band goes on two lines on a small screen** (V9, item
   * 3.2). At the wide view on a phone each slab is about 110 pixels
   * across and the band's twenty-nine characters get 3.8 pixels each; on
   * two lines they get 7.9. Nothing is abbreviated, dropped or dimmed —
   * the layout changes, the words do not. Read once, before the first
   * canvas is drawn.
   */
  setBandOnTwoLines(coarse);
  // And which band it is. Read here, before the first canvas is drawn, for
  // the same reason: every screen in the set shares one answer to it.
  setBandReplay(mode === 'replay');

  // The press record the world's click handlers ask (V10, defect A).
  useEffect(() => watchGestures(), []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target && ['INPUT', 'SELECT', 'TEXTAREA', 'BUTTON'].includes(target.tagName)) return;
      if (event.key === 'v' || event.key === 'V')
        setView((v) => (v === 'room' ? 'tabletop' : 'room'));
      else if (event.key === '1') setFocus('virgil');
      else if (event.key === '2') setFocus('fabricator');
      else if (event.key === '3') setFocus('prover');
      else if (event.key === '4') setFocus('keeper');
      else if (event.key === '5') setFocus('board');
      else if (event.key === '0' || event.key === 'Escape') setFocus('all');
      else if (event.key === 'p' || event.key === 'P')
        setPanel((current) => (current ? null : panelFor(focus)));
      else if (event.key === 'r' || event.key === 'R')
        setMode((m) => (m === 'replay' ? 'demo' : 'replay'));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [focus]);

  const start = cameraPose(view, focus, viewportAspect());
  return (
    <SettingsContext.Provider value={settings}>
      <div className="room-stage">
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
          onPointerMissed={() => setFocus('all')}
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
                <Tabletop />
                {/* The cheap floor reflection (V8.2): smears under the
                    consoles and the cast, no second render of the scene. */}
                <FloorSheen />
              </>
            )}
            <Orrery />
            <Cast demo={demo} mode={mode} speed={speed} onSelect={setFocus} onOpen={open} />
            <Ready />
          </Suspense>
          <Rig view={view} focus={focus} />
          {coarse ? null : <Post view={view} />}
        </Canvas>
        {/* The controls are not part of the world either: the same
            `.room-stage` event source would otherwise raycast every press
            on a button into the scene and re-frame the camera behind it
            (V10, defect B). */}
        <div
          className="room-controls"
          onPointerDown={(event) => event.stopPropagation()}
          onPointerUp={(event) => event.stopPropagation()}
        >
          <span className="room-controls-group">
            <span className="room-controls-label">Demo</span>
            <button type="button" className={demo ? 'is-active' : ''} onClick={() => setDemo(true)}>
              On
            </button>
            <button
              type="button"
              className={demo ? '' : 'is-active'}
              onClick={() => setDemo(false)}
            >
              Off
            </button>
          </span>
          {/* The two modes, in the same idiom as Demo On/Off. */}
          <span className="room-controls-group">
            <span className="room-controls-label">Run</span>
            <button
              type="button"
              className={mode === 'demo' ? 'is-active' : ''}
              onClick={() => setMode('demo')}
              title="A scripted thirty-second loop of invented content"
            >
              Scripted
            </button>
            <button
              type="button"
              className={mode === 'replay' ? 'is-active' : ''}
              onClick={() => setMode('replay')}
              title="The Phase 0 consolidation, a run that actually happened, replayed"
            >
              Replay
            </button>
          </span>
          {/* Fast by default, and slowable so a beat can be looked at. The
              label is the compression itself, derived from the run's
              recorded span over the playback length — never asserted. */}
          {mode === 'replay' ? (
            <span className="room-controls-group">
              <span className="room-controls-label">Speed</span>
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
            </span>
          ) : null}
          <span className="room-controls-group">
            <span className="room-controls-label">View</span>
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
              title="The room is retired, not removed; it is here in case the owner goes back to it"
            >
              Room (retired)
            </button>
          </span>
          <span className="room-controls-group">
            <span className="room-controls-label">Look at</span>
            {(['all', 'virgil', ...ROLES, 'board'] as Focus[]).map((who) => (
              <button
                type="button"
                key={who}
                className={focus === who ? 'is-active' : ''}
                onClick={() => setFocus(who)}
              >
                {who === 'all'
                  ? 'All'
                  : who === 'virgil'
                    ? 'Virgil'
                    : who === 'board'
                      ? 'Board'
                      : CAST[who].label}
              </button>
            ))}
          </span>
          <span className="room-controls-hint">
            Drag to look around. Scroll to move closer. Tap a character to go to them; Board is
            Virgil's three screens; Esc comes back. V shows the retired room.
          </span>
        </div>
        <Panel target={panel} onClose={() => setPanel(null)} />
        {/* The badge, which may never be hidden, and which now has to say
            which of two opposite claims is on screen. */}
        {demo && mode === 'replay' ? (
          <div className="room-demo-badge is-recorded" role="status">
            RECORDED RUN, REPLAYED AT {compressionOf(speed)}× — the Phase 0 consolidation, which
            began {recordedClock(RUN.startedAt)} and ran {recordedDuration(RUN_SECONDS)}. Candidate
            3b9a964e was reviewed, passed with non-blocking findings and merged as{' '}
            {RUN.mergeSha.slice(0, 7)}. Every figure is read out of this repository's committed
            record. It is past fact, not live state.
          </div>
        ) : null}
        {demo && mode === 'demo' ? (
          <div className="room-demo-badge" role="status">
            SCRIPTED DEMONSTRATION — a fixed thirty-second loop driven by no real events. Every
            screen is illustrative; nothing shown is this repository's state.
          </div>
        ) : null}
      </div>
    </SettingsContext.Provider>
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
 * Everyone in the set and everything they read: Virgil (rigged) with his
 * face, his console spotlit while he conducts, and his three slabs above
 * him; each of the three at their own console with their face, the
 * console's own screen and its light, the console spotlit while they
 * work. Driven by the demo timeline when it runs, otherwise resting.
 */
function Cast({
  demo,
  mode,
  speed,
  onSelect,
  onOpen,
}: {
  demo: boolean;
  mode: RunMode;
  speed: ReplaySpeed;
  onSelect: (focus: Focus) => void;
  onOpen: (target: PanelTarget, to: Focus) => void;
}) {
  const forced = forcedFace();
  // Both clocks are mounted; the one that is not the current mode is idle.
  // Hooks may not be called conditionally, and this keeps the render loop's
  // two advances independent of React's ordering.
  const scripted = useDemo(demo && forced === null && mode === 'demo');
  const replayed = useReplay(demo && forced === null && mode === 'replay', speed);
  const running = mode === 'replay' ? replayed : scripted;
  const state = forced ? forcedState(forced) : running;
  // The panel is DOM outside the canvas and reads the demonstration from
  // here, so a beat change re-renders the panel and nothing in the scene.
  publishDemoState(state);
  const virgilBusy = state.pose !== 'rest' || state.virgilFace !== 'idle';
  return (
    <>
      <VirgilConsole active={virgilBusy && !state.content.ownerGate} />
      <VirgilRigged pose={state.pose} face={state.virgilFace} onSelect={() => onSelect('virgil')} />
      <ScreenBank
        content={state.content}
        outcome={state.outcome}
        seconds={state.seconds}
        mode={state.mode}
        speed={speed}
        onOpen={(slab: SlabName, row?: number) =>
          onOpen(row === undefined ? { kind: 'slab', slab } : { kind: 'ledger', row }, 'board')
        }
      />
      {ROLES.map((role) => {
        const member = state.cast[role];
        return (
          <group key={role}>
            <Station role={role} active={member.activity !== 'rest'} />
            <Figure role={role} face={member.face} activity={member.activity} onSelect={onSelect} />
            <ConsoleScreen
              role={role}
              state={member.station}
              report={member.report}
              outcome={state.outcome}
              work={member.work}
              quiet={state.content.ownerGate ? 0.75 : 0}
              onOpen={() => onOpen({ kind: 'role', role }, role)}
            />
            <StationLight role={role} activity={member.activity} report={member.report} />
          </group>
        );
      })}
    </>
  );
}

/** The post pipeline for the style: little bloom, more saturation, less contrast, grain on the tabletop. */
function Post({ view }: { view: View }) {
  return (
    <EffectComposer multisampling={0} enableNormalPass={false}>
      {/* Cut general bloom; keep emissive glow. The threshold sits above
          every matte surface and below the faces, the orrery and the
          screens, which are untone-mapped and the only things that carry
          meaning in glow. */}
      <Bloom
        intensity={0.38}
        luminanceThreshold={0.86}
        luminanceSmoothing={0.25}
        mipmapBlur
        resolutionScale={0.5}
      />
      {/* Compress the value range and push saturation: less contrast, more
          colour separation, which reads as cartoon more than any geometry. */}
      <HueSaturation hue={0} saturation={0.22} />
      <BrightnessContrast brightness={0.02} contrast={-0.1} />
      {view === 'tabletop' ? <Noise premultiply opacity={0.09} /> : <></>}
      <Vignette eskil={false} offset={0.3} darkness={0.38} />
    </EffectComposer>
  );
}

type Pose = CameraPose;

/** The viewport's aspect at mount, for the first pose; the rig follows resizes. */
function viewportAspect(): number {
  if (typeof window === 'undefined') return 16 / 9;
  const footer = Number.parseFloat(
    getComputedStyle(document.documentElement).getPropertyValue('--owner-footer-height'),
  );
  return window.innerWidth / Math.max(1, window.innerHeight - (footer || 34));
}

/**
 * The camera for a view, a focus and the viewport's aspect. The authored
 * views — the tabletop's answers to the aspect, almost level with the
 * characters — and for each character a pose near their eye level, read
 * off the visor that travels with their model, standing where their
 * console's screen is in the frame beside them; for Virgil his face; for
 * the board his three slabs, from a distance the aspect needs to hold
 * all three.
 */
export function cameraPose(view: View, focus: Focus, aspect = 16 / 9): Pose {
  if (focus === 'virgil') {
    const [vx, vy, vz] = layout.virgilAt;
    // His screen's centre is 1.13 m above his feet (head joint at 0.81 m,
    // visor centre 0.32 m above it in the joint's frame at scale 0.6).
    const eye = vy + 1.13;
    return { position: [vx + 0.55, eye + 0.25, vz + 3.1], target: [vx, eye - 0.05, vz], fov: 38 };
  }
  if (focus === 'board') {
    const { y, z, spread } = layout.screenBank;
    const fov = 44;
    const halfWidth = spread + 0.85;
    const distance = Math.max(5, halfWidth / (Math.tan((fov / 2) * (Math.PI / 180)) * aspect));
    return { position: [0, y - 0.1, z + distance], target: [0, y - 0.15, z], fov };
  }
  // A character's close-up is derived from their console's own screen
  // (`closeUp.ts`), not posed: on the screen's measured axis, with the
  // lens the screen needs at this aspect. V8 posed it by hand out to one
  // side, and at that obliquity the Prover's own dial and the Keeper's
  // body stood in front of his screen and a phone cropped the
  // Fabricator's; `test/close-up-sight.test.ts` holds the sight lines now.
  if (focus !== 'all') return closeUpPose(focus, aspect);
  if (view === 'tabletop') return tabletopCamera(aspect);
  const cam = layout.camera;
  return { position: [...cam.position], target: [...cam.target], fov: cam.fov };
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
 * The orbit's limits once the camera has arrived. The room's as before;
 * the tabletop's a 120° arc at about 30° elevation, which is also what
 * stops the owner orbiting round to find the back of the set undressed;
 * a focused character allows a little either side of the pose.
 */
export function limitsFor(view: View, focus: Focus, pose: Pose): Limits {
  const dx = pose.position[0] - pose.target[0];
  const dz = pose.position[2] - pose.target[2];
  const azimuth = Math.atan2(dx, dz);
  const dy = pose.position[1] - pose.target[1];
  const polar = Math.atan2(Math.hypot(dx, dz), dy);
  if (focus !== 'all') {
    // Every bound is taken from the pose the rig just authored, so a
    // clamp can never be a number that disagrees with where the camera
    // has been put. V8 held the polar angle to a fixed 1.0–1.6 and the
    // distance to 1.4–6, which happened to contain its hand-set poses;
    // a derived pose has no such guarantee, and a bound that excludes
    // the pose is how a close-up ends up somewhere else.
    const distance = Math.hypot(dx, dy, dz);
    return {
      minPolarAngle: polar - 0.35,
      maxPolarAngle: polar + 0.35,
      minAzimuthAngle: azimuth - 0.7,
      maxAzimuthAngle: azimuth + 0.7,
      minDistance: Math.min(1.4, distance),
      maxDistance: Math.max(focus === 'board' ? 14 : 6, distance),
    };
  }
  if (view === 'room') {
    return {
      minPolarAngle: 0.5,
      maxPolarAngle: 1.5,
      minAzimuthAngle: -1.1,
      maxAzimuthAngle: 1.1,
      minDistance: 2.5,
      maxDistance: 10,
    };
  }
  // The tabletop: from a little below the pose's own elevation to some
  // way above it, on a 120° arc — the owner can rise to look over the
  // set but not sink under the disc.
  return {
    minPolarAngle: polar - 0.45,
    maxPolarAngle: polar + 0.1,
    minAzimuthAngle: -Math.PI / 3,
    maxAzimuthAngle: Math.PI / 3,
    minDistance: 6,
    maxDistance: 22,
  };
}

/** Writes a set of limits onto the controls, now, with no React in between. */
function applyLimits(controls: ComponentRef<typeof OrbitControls>, limits: Limits): void {
  controls.minPolarAngle = limits.minPolarAngle;
  controls.maxPolarAngle = limits.maxPolarAngle;
  controls.minAzimuthAngle = limits.minAzimuthAngle;
  controls.maxAzimuthAngle = limits.maxAzimuthAngle;
  controls.minDistance = limits.minDistance;
  controls.maxDistance = limits.maxDistance;
}

/**
 * Orbit, and the driver that carries the camera to a view's or a focus's
 * pose: a smooth move of under a second (instant with reduced motion),
 * with the orbit's limits lifted while it travels and restored when it
 * arrives, so no clamp can snatch the camera mid-flight.
 *
 * **The limits are written onto the controls imperatively, in the same
 * frame as the pose, and never as React props.** V8 held them in
 * component state and called `setLimits(UNBOUNDED)` when the focus
 * changed; that lands a frame or two later, and on a renderer where one
 * frame is a second long the whole flight finished inside the first
 * frame. So `OrbitControls.update()` clamped the new pose against the
 * **previous** view's bounds — the wide tabletop's `minDistance: 6` —
 * and pushed the camera 2.62 m back along its own view axis, straight
 * into Virgil, whose head then filled the frame while the pose the code
 * had authored was 3.38 m from its target. Measured on the V8 artifact:
 * every one of the three close-ups came to rest at exactly 6.000 m from
 * its target. The rig's own comment claimed no clamp could snatch the
 * camera mid-flight; asynchronous state is exactly how one did.
 */
function Rig({ view, focus }: { view: View; focus: Focus }) {
  const controls = useRef<ComponentRef<typeof OrbitControls>>(null);
  const camera = useThree((s) => s.camera);
  const size = useThree((s) => s.size);
  // The aspect in coarse steps, so that a phone's browser chrome sliding in
  // and out does not re-pose the camera, while turning the phone does.
  const aspect = Math.round((size.width / Math.max(1, size.height)) * 10) / 10;
  const { reducedMotion } = useSettings();
  /** The limits in force. A ref, not state: a frame must never see a stale bound. */
  const limits = useRef<Limits>(UNBOUNDED);
  const flight = useRef<{
    from: { p: THREE.Vector3; t: THREE.Vector3 };
    to: Pose;
    elapsed: number;
    seconds: number;
    limits: Limits;
  } | null>(null);
  const first = useRef(true);

  useEffect(() => {
    const to = cameraPose(view, focus, aspect);
    const c = controls.current;
    flight.current = {
      from: {
        p: camera.position.clone(),
        t: c ? c.target.clone() : new THREE.Vector3(...to.target),
      },
      to,
      elapsed: 0,
      seconds: reducedMotion || first.current ? 0 : 0.9,
      limits: limitsFor(view, focus, to),
    };
    first.current = false;
    // Lifted here and again on every frame of the flight, so that no
    // ordering between React and the render loop can leave a bound in
    // force that the pose being flown to does not satisfy.
    limits.current = UNBOUNDED;
    if (c) applyLimits(c, UNBOUNDED);
  }, [view, focus, camera, reducedMotion, aspect]);

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
      // Unbounded while travelling; the arrival's own bounds from the
      // moment it arrives — both written before `update()` reads them.
      limits.current = k >= 1 ? f.limits : UNBOUNDED;
      if (k >= 1) flight.current = null;
    }
    applyLimits(c, limits.current);
    c.update();
    // Publish the view, so a press can be told from a gesture that moved
    // it (V10, defect A). Six numbers, after `update()` and therefore
    // after damping: what the eye is actually looking at this frame.
    reportCamera([
      camera.position.x,
      camera.position.y,
      camera.position.z,
      c.target.x,
      c.target.y,
      c.target.z,
    ]);
  });

  // No limit props: they are written on the object above, in the frame
  // that needs them. A prop here would be re-applied on every React
  // render and would race the rig for the same six numbers.
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
 * Renders nothing; it exists so that the verifier can wait for the moment
 * every model and the window layers have decoded and the scene has drawn.
 */
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

/**
 * `#/?state=blocked` holds every face and screen in one state instead of
 * running the demo, so the captures can judge each state at rest. Not a
 * feature; a way to see. Read once at mount, like the camera.
 */
function forcedFace(): FaceState | null {
  const value = query().get('state');
  return (FACE_STATES as readonly string[]).includes(value ?? '') ? (value as FaceState) : null;
}

/**
 * `#/?run=replay` opens on the replay, and `#/?speed=slow|fast|fastest`
 * chooses its speed. Not features; the way the captures reach a named
 * entry point deterministically, exactly as `#/?demo=` and `#/?cam=` are.
 */
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

/** `#/?view=room` opens on the retired room; the tabletop otherwise. */
function initialView(): View {
  return query().get('view') === 'room' ? 'room' : 'tabletop';
}

/**
 * Which record the `P` key opens: the one belonging to whatever the camera
 * is already looking at, so the keyboard can reach the panel at a named
 * entry point for the captures without a click landing on a moving mesh.
 */
function panelFor(focus: Focus): PanelTarget | null {
  if (focus === 'board' || focus === 'virgil') return { kind: 'slab', slab: 'verdict' };
  if (focus === 'all') return { kind: 'slab', slab: 'roles' };
  return { kind: 'role', role: focus };
}

/** `#/?cam=prover` opens looking at the Prover, for the captures. */
function initialFocus(): Focus {
  const cam = query().get('cam');
  if (cam === 'virgil' || cam === 'board' || (ROLES as readonly string[]).includes(cam ?? ''))
    return cam as Focus;
  return 'all';
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
