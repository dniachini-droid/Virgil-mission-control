import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { prefersReducedMotion } from '../../ui/settings.js';
import {
  canInstruct,
  instruct,
  LIVE_COMPOSER_NOTE,
  liveTransport,
  storedSecret,
} from '../live/liveSession.js';
import { useDemoState } from '../panel/panelStore.js';
import { BlockView } from './Blocks.jsx';
import type { Message, Section } from './blocks.js';
import { SESSION_ACTIONS, transport } from './session.js';
import { type Agent, type WindowTarget, windowDoc } from './windowContent.js';
import {
  COMPOSER_NOTE,
  keepTurn,
  openSections,
  scrollOf,
  setDraft,
  setScroll,
  toggleSection,
  useWindowMemory,
} from './windowStore.js';
import './window.css';

/**
 * **The window: a full-screen page on a phone, not a desktop modal shrunk into
 * a portrait viewport.**
 *
 * The owner's decisions this implements, each of which constrains the code and
 * not only the look (`docs/process/PHASE_1_CONVERSATION_INTERFACE.md` §5b, and
 * the V11 brief's stage 3):
 *
 *  - **One tap does both, concurrently.** `MobileRoom` sets this window's
 *    target and the camera's focus in the same event: the window is up
 *    immediately and the camera travels underneath it. *"So you arent waiting
 *    to be taken there first."* This reverses stage 1's deliberate delay, which
 *    was built to the brief's stage-1 line about a transition before the
 *    interface opens; the owner's own decision governs and stage 3's record
 *    says so plainly.
 *  - **It renders from data, never from the camera arriving.** It is DOM
 *    outside `<Canvas>`, reads the demonstration from `panelStore.ts`, and
 *    holds no reference to the camera, the controls or the flight.
 *  - **Dismissing it leaves the reader at the station**, never snapped back.
 *    Its own chevron is one step: window → station. The station's own control
 *    is the next step: station → overview. Back is one step per level, and the
 *    way home is never hidden — which is the stage-1 compromise this stage was
 *    asked to fix.
 *  - **The entry animates on the compositor only** — `transform` and `opacity`,
 *    no layout — because it plays at the same moment as the camera flight and
 *    on a phone both land on the worst frame budget in the product. It grows
 *    out of the point on screen where the character's display was, so the
 *    interface expands from that display rather than appearing over it.
 *  - **`prefers-reduced-motion` is honoured by rendering it open**, never by
 *    hiding it. KR-55 is the history: a reduced-motion branch once deleted both
 *    of Virgil's faces.
 *
 * Everything readable or pressable is inside the safe-area insets; the world
 * paints under them.
 */

const OPEN_SECONDS = 0.34;
const CLOSE_SECONDS = 0.2;

export interface WindowOrigin {
  /** Where on screen the character's display was, in CSS pixels. */
  x: number;
  y: number;
}

export function AgentWindow({
  target,
  origin,
  onClose,
  onGo,
}: {
  target: WindowTarget | null;
  origin: WindowOrigin | null;
  /** One step back: to the station the reader has been taken to. */
  onClose: () => void;
  /** Another agent's window, without going back to the world first. */
  onGo: (agent: Agent, at?: string) => void;
}) {
  const state = useDemoState();
  const [leaving, setLeaving] = useState<WindowTarget | null>(null);
  const shown = target ?? leaving;
  /**
   * **No state, no document — `KP10-13`.**
   *
   * `useDemoState` returns `null` on a live page that has read nothing, and
   * this is where that has to mean something. It used to be impossible: the
   * store always held the recording's first frame, so a surface with nothing
   * to say drew the recording instead. `windowDoc` is given a state or it is not
   * called, and `!doc` below already renders nothing at all.
   *
   * Nothing is the correct drawing. The page's own notice says why.
   */
  const doc = useMemo(() => (shown && state ? windowDoc(state, shown) : null), [state, shown]);
  const key = doc?.key ?? '';
  const memory = useWindowMemory(key);
  const sheet = useRef<HTMLElement>(null);
  const body = useRef<HTMLDivElement>(null);
  const raf = useRef(0);
  const exitRaf = useRef(0);
  const reduced = useRef(prefersReducedMotion());
  const [kept, setKept] = useState('');
  const keyboard = useKeyboardInset();

  /** One progress value drives the whole entry, so it can be reasoned about. */
  const frame = useCallback((k: number) => {
    const t = Math.min(1, Math.max(0, k));
    const ease = 1 - (1 - t) ** 3;
    const node = sheet.current;
    if (!node) return;
    node.style.opacity = String(Math.min(1, t * 3));
    node.style.transform = `translate3d(0, ${(1 - ease) * 26}px, 0) scale(${0.94 + 0.06 * ease})`;
  }, []);

  useLayoutEffect(() => {
    if (!target) return;
    const node = sheet.current;
    if (node && origin) {
      // The window grows from the point the character's display occupied.
      node.style.transformOrigin = `${origin.x}px ${origin.y}px`;
    }
    if (reduced.current) {
      frame(1);
      return;
    }
    const started = performance.now();
    frame(0);
    const tick = () => {
      const k = (performance.now() - started) / (OPEN_SECONDS * 1000);
      frame(k);
      if (k < 1) raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    // Only the entry's handle. Cancelling the exit's here is V10's defect B,
    // recorded at length in `panel/Panel.tsx`, and is not repeated.
    return () => cancelAnimationFrame(raf.current);
  }, [target, origin, frame]);

  useEffect(
    () => () => {
      cancelAnimationFrame(raf.current);
      cancelAnimationFrame(exitRaf.current);
    },
    [],
  );

  const close = useCallback(() => {
    if (!target) return;
    if (reduced.current) {
      setLeaving(null);
      onClose();
      return;
    }
    setLeaving(target);
    onClose();
    cancelAnimationFrame(raf.current);
    const started = performance.now();
    const tick = () => {
      const k = (performance.now() - started) / (CLOSE_SECONDS * 1000);
      frame(1 - k);
      if (k < 1) exitRaf.current = requestAnimationFrame(tick);
      else setLeaving(null);
    };
    exitRaf.current = requestAnimationFrame(tick);
  }, [target, onClose, frame]);

  // Escape is the keyboard's back chevron: one step, to the station.
  useEffect(() => {
    if (!target) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        close();
      }
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [target, close]);

  /**
   * **Scroll is preserved per window**, which the brief asks for by name. The
   * position is restored on the layout pass so the reader never sees the top
   * of a conversation they were half way down.
   */
  useLayoutEffect(() => {
    if (!target || !body.current) return;
    body.current.scrollTop = scrollOf(key);
  }, [target, key]);

  /**
   * **Focus lands on the sheet, not on its first control**, and that is a
   * change made from looking at a frame: focusing the back chevron drew a
   * `:focus-visible` ring around it on every open, so a touch reader met a
   * large cyan box around the one control they had not chosen to use. The
   * sheet takes focus as a container (`tabIndex={-1}`), which puts a screen
   * reader at the top of the dialog and makes the **next** Tab the back
   * chevron — the first thing in the DOM — so the reading order is still
   * back, actions, conversation, evidence, composer.
   */
  useEffect(() => {
    if (!target) return;
    sheet.current?.focus({ preventScroll: true });
  }, [target]);

  if (!shown || !doc) return null;
  const open = openSections(key);
  const thread: Message[] = [...doc.messages, ...memory.typed];

  return (
    <div
      className="v11w-root"
      /* The window is not part of the world and its presses must not reach it:
         `<Canvas>` connects its pointer events to the canvas's parent, which is
         `.v11-stage`, and this is inside it (V10, defect B). */
      onPointerDown={(event) => event.stopPropagation()}
      onPointerUp={(event) => event.stopPropagation()}
    >
      <div className="v11w-scrim" />
      <section
        className="v11w-sheet"
        ref={sheet}
        role="dialog"
        aria-modal="true"
        tabIndex={-1}
        aria-labelledby="v11w-name"
        /* Described by the recorded-run marking when there is one. The
           scripted mode has none since 9 September (`windowContent.ts`,
           `honesty`), and pointing `aria-describedby` at an element that is
           not in the document makes a screen reader announce nothing for it —
           so the attribute is present only with the element. */
        {...(doc.honesty ? { 'aria-describedby': 'v11w-honesty' } : {})}
        style={{ '--v11w-tint': doc.accent, '--v11w-kb': `${keyboard}px` } as React.CSSProperties}
      >
        <header className="v11w-head">
          <div className="v11w-head-row">
            <button
              type="button"
              className="v11w-back"
              data-touch-target="window-back"
              onClick={close}
              aria-label={`Back to ${doc.name}’s station`}
            >
              <Chevron />
              <span className="v11w-back-word">Back</span>
            </button>
            <Portrait agent={doc.agent} reaction={doc.reaction} tint={doc.accent} />
            <div className="v11w-identity">
              <h1 className="v11w-name" id="v11w-name">
                {doc.name}
              </h1>
              <p className="v11w-status">
                <span
                  className="v11w-status-dot"
                  style={{ background: doc.status.tint }}
                  aria-hidden="true"
                />
                <b>{doc.status.word}</b>
                <span className="v11w-status-means">{doc.status.means}</span>
              </p>
            </div>
          </div>
          {/* The quiet progression treatment. It replaces V9's oversized
              technical breadcrumb `HOP 2 OF 3 · PROVER'S CONSOLE` with three
              named steps in ordinary words and one small line under them. */}
          <div className="v11w-progress" aria-label={`Progress: ${doc.progression.label}`}>
            <ol className="v11w-pips">
              {doc.progression.steps.map((step) => (
                <li className={`is-${step.state}`} key={step.label}>
                  <i aria-hidden="true" />
                  <span>{step.label}</span>
                </li>
              ))}
            </ol>
            {/* No separator glyph between these two: at 390 px the candidate
                state wraps and a `·` was left dangling at the end of the line
                above it. The gap and the colour do the separating. */}
            <p className="v11w-context">
              <span className="v11w-progress-word">{doc.progression.label}</span>
              <code>{doc.context}</code>
            </p>
          </div>
        </header>

        {/* The recorded run says what it is. The scripted mode does not: the
            owner's instruction of 9 September removed its amber band and its
            paragraph outright, leaving the `Demo data` chip in the overview
            chrome as the one place the interface says so. Nothing takes the
            band's place — `.v11w-head` carries its own bottom rule and
            `.v11w-body` is `flex: 1`, so the sheet closes up rather than
            leaving the gap where it was. */}
        {doc.honesty ? (
          <p className="v11w-honesty" id="v11w-honesty" role="note">
            <b>{doc.honesty.title}</b>
            <span>{doc.honesty.note}</span>
          </p>
        ) : null}

        <div
          className="v11w-body"
          ref={body}
          onScroll={(event) => setScroll(key, event.currentTarget.scrollTop)}
        >
          {/* What happened, what it means, what happens next. Never a table. */}
          <section className="v11w-lead" aria-label="What happened">
            <h2 className="v11w-headline">{doc.conclusion.headline}</h2>
            {/* The exact verdict, as a token rather than as a shouted heading. */}
            {doc.conclusion.token ? (
              <p className="v11w-verdict-token">{doc.conclusion.token}</p>
            ) : null}
            <p className="v11w-meaning">{doc.conclusion.meaning}</p>
            <p className="v11w-next">{doc.conclusion.next}</p>
          </section>

          <div className="v11w-actions" aria-label="What you can do here">
            {doc.actions.map((action) => (
              <button
                type="button"
                className="v11w-action"
                key={action.id}
                data-touch-target={`action-${action.id}`}
                onClick={() => {
                  if (action.goes.kind === 'agent') onGo(action.goes.agent, action.goes.at);
                  else {
                    toggleSection(key, action.goes.id, true);
                    const id = action.goes.id;
                    requestAnimationFrame(() => {
                      body.current
                        ?.querySelector(`[data-section="${id}"]`)
                        ?.scrollIntoView({ block: 'start' });
                    });
                  }
                }}
              >
                {action.label}
              </button>
            ))}
          </div>

          <div className="v11w-thread" aria-label="The conversation">
            {thread.map((message) => (
              <Turn message={message} key={message.id} />
            ))}
          </div>

          <div className="v11w-sections">
            {doc.sections.map((section) => (
              <Expandable
                section={section}
                open={open[section.id] ?? section.open ?? false}
                onToggle={(next) => toggleSection(key, section.id, next)}
                key={section.id}
              />
            ))}
          </div>
        </div>

        <div className="v11w-foot">
          {/* The five session controls: declared, labelled, and not one of them
              connected. They are `disabled` and `aria-disabled` rather than
              buttons that quietly do nothing, and merge is not among them at
              all — it is the owner's alone in every phase. */}
          <details className="v11w-controls">
            {/* Two elements and a CSS gap, not a whitespace text node: the
                summary is a flex container, and a whitespace-only text node
                between flex items is not rendered at all. It came out as
                "Session controls— none is connected" in the frames. */}
            <summary>
              <span>Controls</span>
              <span className="v11w-fine">— none of them works</span>
            </summary>
            <div className="v11w-control-row">
              {SESSION_ACTIONS.map((action) => (
                <button
                  type="button"
                  className="v11w-control"
                  key={action.id}
                  disabled
                  aria-disabled="true"
                  title={transport().act(action.id).note}
                >
                  {action.label}
                </button>
              ))}
            </div>
            {/**
             * **The Keeper's KP2-03.** This printed `NO_SESSION.absence` —
             * *"No agents are running. Nothing here can change your project."* —
             * unconditionally, on the same screen as a button labelled **Send**
             * that starts a real session. `liveTransport` existed to prevent
             * exactly that and was never wired to anything; a repository-wide
             * search for it found only the file defining it.
             *
             * It is wired now. In the Owner Build `liveTransport` returns the
             * refusal unchanged, so that build says what it has always said and
             * `verify:owner:v11`'s requirement of *"is not sent"* still holds.
             */}
            <p className="v11w-fine">
              {liveTransport(transport()).absence} Only you can put a change in.
            </p>
          </details>

          {/* Always available, always beneath the suggested actions, and always
              honest about what it is (§5a, decision 3). */}
          <form
            className="v11w-composer"
            onSubmit={(event) => {
              event.preventDefault();
              /**
               * **Two behaviours, and the button says which one it is.**
               *
               * In the Owner Build there is nothing to send to, and the seam in
               * `session.ts` implements that as a refusal: the message is kept
               * on the page and the note says so. In the hosted build, once the
               * owner has given the page his secret, the same box starts a real
               * session — and reports exactly what the endpoint answered,
               * including a refusal. A composer that said *sent* on a 409 would
               * be the same class of lie as a verdict nobody returned.
               */
              const secret = canInstruct() ? storedSecret() : null;
              if (!secret) {
                setKept(keepTurn(key, memory.draft));
                return;
              }
              const text = memory.draft;
              setKept('Sending…');
              void instruct(text, secret).then((outcome) => {
                if (outcome.sent) keepTurn(key, text);
                setKept(outcome.note);
              });
            }}
          >
            {/* The long invitation is the label a screen reader reads; the
                placeholder is short because at 390 px the long one wrapped to
                two lines inside a one-line box and was clipped — found by
                looking at the frame, not by reasoning about it. */}
            <label className="v11w-sr" htmlFor="v11w-input">
              {canInstruct()
                ? `Tell ${doc.name} what to do. This starts a real session on the working branch.`
                : `Ask ${doc.name} to plan, inspect or explain anything. Nothing is sent — there is nothing running behind this build.`}
            </label>
            <textarea
              id="v11w-input"
              className="v11w-input"
              rows={1}
              value={memory.draft}
              placeholder={`Ask ${doc.name} anything…`}
              onChange={(event) => setDraft(key, event.target.value)}
            />
            <button
              type="submit"
              className="v11w-keep"
              data-touch-target="composer-keep"
              aria-label={
                canInstruct()
                  ? 'Send this instruction and start a session.'
                  : 'Save your message on this page. It will not be sent.'
              }
            >
              {canInstruct() ? 'Send' : 'Keep'}
            </button>
          </form>
          <p className="v11w-composer-note" role="status">
            {/* Also KP2-03: this was `COMPOSER_NOTE`, which is `NO_SESSION_NOTE`
                — "It is not sent because no agents are actually running" — shown
                beneath a Send button that sends. */}
            {kept === '' ? (canInstruct() ? LIVE_COMPOSER_NOTE : COMPOSER_NOTE) : kept}
          </p>
        </div>
      </section>
    </div>
  );
}

function Chevron() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" focusable="false">
      <path
        d="M15 5 L8 12 L15 19"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.1"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/**
 * **The small character portrait, and its reactions.** A head, an eye band and
 * a mouth line, in the agent's own accent, with one class per face state so
 * *"small character reactions while work proceeds"* happen here rather than
 * only in the 3D scene. Every animation is `transform` or `opacity`, and
 * `window.css` stops all of them under reduced motion.
 */
function Portrait({ agent, reaction, tint }: { agent: Agent; reaction: string; tint: string }) {
  return (
    <span className={`v11w-portrait is-${reaction}`} aria-hidden="true">
      {/* Refined after looking at the first frames, where the head read as a
          dark disc with a dash in it: the helmet is lighter than the ground,
          the visor is the agent's own accent at full strength, and the collar
          gives the silhouette a shoulder line so it reads as a figure at
          44 px rather than as a glyph. */}
      <svg viewBox="0 0 44 44" width="44" height="44" focusable="false">
        <circle cx="22" cy="22" r="20.5" fill="rgba(16,22,48,0.95)" />
        <circle
          cx="22"
          cy="22"
          r="20.5"
          fill="none"
          stroke={tint}
          strokeWidth="1.2"
          opacity="0.7"
        />
        <path
          d="M8 40 C10 31 15.5 28 22 28 C28.5 28 34 31 36 40 Z"
          fill="rgba(28,36,72,0.95)"
          stroke={tint}
          strokeWidth="0.7"
          opacity="0.85"
        />
        <rect x="12.5" y="11" width="19" height="17" rx="6.5" fill="rgba(30,40,78,0.98)" />
        <rect className="v11w-visor" x="14.5" y="16" width="15" height="6.5" rx="3.2" fill={tint} />
        <path
          className="v11w-mouth"
          d={agent === 'virgil' ? 'M17.5 25.5 h9' : 'M18.5 25.5 h7'}
          stroke={tint}
          strokeWidth="1.3"
          strokeLinecap="round"
          opacity="0.55"
        />
      </svg>
      <i className="v11w-pulse" />
    </span>
  );
}

const SPEAKER_NAME: Record<string, string> = {
  virgil: 'Virgil',
  fabricator: 'Fabricator',
  prover: 'Prover',
  keeper: 'Keeper',
  owner: 'You',
  system: 'About this version',
};

function Turn({ message }: { message: Message }) {
  return (
    <article
      className={`v11w-turn is-${message.from}${message.streaming ? ' v11w-streaming' : ''}`}
    >
      <header>
        <span className="v11w-from">{SPEAKER_NAME[message.from] ?? message.from}</span>
        <span className="v11w-at">{message.at}</span>
        {message.streaming ? (
          <span className="v11w-arriving">
            <i aria-hidden="true" />
            still arriving
          </span>
        ) : null}
      </header>
      {message.blocks.map((block, index) => (
        <BlockView block={block} id={`${message.id}-${index}`} key={`${message.id}-${index}`} />
      ))}
    </article>
  );
}

/** Detailed evidence on demand: closed until asked for, and named while closed. */
function Expandable({
  section,
  open,
  onToggle,
}: {
  section: Section;
  open: boolean;
  onToggle: (open: boolean) => void;
}) {
  return (
    <section className="v11w-section" data-section={section.id}>
      <h3>
        <button
          type="button"
          className="v11w-disclose"
          data-touch-target={`section-${section.id}`}
          aria-expanded={open}
          onClick={() => onToggle(!open)}
        >
          <span className="v11w-disclose-mark" aria-hidden="true" />
          <span className="v11w-disclose-title">{section.title}</span>
          <span className="v11w-disclose-summary">{section.summary}</span>
        </button>
      </h3>
      {open ? (
        <div className="v11w-section-body">
          {section.blocks.map((block, index) => (
            <BlockView block={block} id={`${section.id}-${index}`} key={`${section.id}-${index}`} />
          ))}
        </div>
      ) : null}
    </section>
  );
}

/**
 * **How much of the viewport the onscreen keyboard has taken.**
 *
 * On iOS the layout viewport does not shrink when the keyboard appears, so a
 * composer pinned to the bottom of `100dvh` ends up underneath it. The
 * `visualViewport` API is the only thing that reports the truth, so the sheet
 * is padded by exactly what it says is missing. Where the API does not exist
 * the value is zero and nothing moves.
 *
 * **No iPhone exists in this environment**, so what is exercised here is a
 * simulated inset: the verifier substitutes a `visualViewport` whose height is
 * short by a keyboard, dispatches its `resize`, and measures that the composer
 * is still on screen. That is recorded as simulated; the real-device check is
 * NOT PERFORMED.
 */
export function useKeyboardInset(): number {
  const [inset, setInset] = useState(0);
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const read = () => {
      const hidden = window.innerHeight - (vv.height + vv.offsetTop);
      setInset(Math.max(0, Math.round(hidden)));
    };
    read();
    vv.addEventListener('resize', read);
    vv.addEventListener('scroll', read);
    return () => {
      vv.removeEventListener('resize', read);
      vv.removeEventListener('scroll', read);
    };
  }, []);
  return inset;
}
