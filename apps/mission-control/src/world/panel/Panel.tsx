import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { prefersReducedMotion } from '../../ui/settings.js';
import { verdictLook } from '../screens/verdicts.js';
import { type PanelDoc, type PanelTarget, panelDoc } from './panelContent.js';
import { useDemoState } from './panelStore.js';
import './panel.css';

/**
 * The panel: clicking a screen opens the full information here.
 *
 * The owner's decisions this implements
 * (`docs/process/PHASE_1_CONVERSATION_INTERFACE.md` §5b), each of which
 * constrains the code and not only the look:
 *
 *  - **One tap does both, concurrently.** `VirgilRoom` sets the panel's
 *    target and the camera's focus in the same event, so the panel is up
 *    immediately and the flight runs underneath it.
 *  - **The panel is driven by data, never by the camera arriving.** It is
 *    DOM outside `<Canvas>`, reads the demonstration's state from
 *    `panelStore.ts`, and has no reference to the camera, the controls or
 *    the flight. There is nothing here that could wait for a frame.
 *  - **Dismissing it leaves the reader at the station.** Closing clears
 *    the panel and nothing else; the camera stays where it flew.
 *  - **The entry animates on the compositor only.** Every animated
 *    property below is `transform` or `opacity`. No width, height, top,
 *    left, margin or padding is animated, because this plays at the same
 *    moment as the camera flight and on a phone both land on the worst
 *    frame budget in the product. Under 400 ms end to end.
 *  - **`prefers-reduced-motion` is honoured by rendering the panel open**,
 *    never by hiding it. KR-55 is the history: a reduced-motion branch
 *    once deleted both of Virgil's faces. Here the reduced-motion path
 *    sets the finished state on the first frame and runs no animation.
 */

const OPEN_SECONDS = 0.38;
const CLOSE_SECONDS = 0.26;

export function Panel({ target, onClose }: { target: PanelTarget | null; onClose: () => void }) {
  const state = useDemoState();
  const [leaving, setLeaving] = useState<PanelTarget | null>(null);
  const shown = target ?? leaving;
  /**
   * **No state, no document — `KP10-13`.**
   *
   * `useDemoState` returns `null` on a live page that has read nothing, and
   * this is where that has to mean something. It used to be impossible: the
   * store always held the recording's first frame, so a surface with nothing
   * to say drew the recording instead. `panelDoc` is given a state or it is not
   * called, and `!doc` below already renders nothing at all.
   *
   * Nothing is the correct drawing. The page's own notice says why.
   */
  const doc = useMemo(() => (shown && state ? panelDoc(state, shown) : null), [state, shown]);
  const root = useRef<HTMLDivElement>(null);
  const rail = useRef<HTMLDivElement>(null);
  const sheet = useRef<HTMLDivElement>(null);
  const body = useRef<HTMLDivElement>(null);
  const railThumb = useRef<HTMLElement>(null);
  const scrollRail = useRef<HTMLDivElement>(null);
  const staged = useRef<HTMLElement[]>([]);
  /**
   * **Two animation handles, not one** (V10, defect B).
   *
   * They were one, and it meant the close control did nothing at all. The
   * exit is started inside `close()`, which in the same breath calls
   * `onClose()`; the parent clears the target; the entry effect's
   * dependency on `target` changes; React runs that effect's **cleanup**,
   * which cancelled `raf.current` — the handle the exit had just been
   * written into. So `setLeaving(null)` never ran, the panel stayed
   * mounted with `target` null, and with it null the Escape listener is
   * not attached either, so nothing could dismiss it. Sliding it down
   * appeared to work only because the drag leaves the sheet translated
   * off the foot of the screen at zero opacity: it looks dismissed and is
   * not.
   *
   * Verified by clicking the control in a browser at 1280 x 800 and
   * 390 x 664, before and after; `test/panel-pointer.test.ts` holds the
   * two handles apart.
   */
  const raf = useRef(0);
  const exitRaf = useRef(0);
  const reduced = useRef(prefersReducedMotion());
  /** What the reader typed. Kept: the composer never pretends to have sent it. */
  const [typed, setTyped] = useState('');
  const phone = usePhone();

  /** One progress value drives the whole entry, so it can be reasoned about. */
  const frame = useCallback(
    (k: number) => {
      const clamp = (t: number) => Math.min(1, Math.max(0, t));
      const ease = (t: number) => 1 - (1 - t) ** 3;
      const r = ease(clamp(k / 0.24));
      if (rail.current) {
        rail.current.style.transform = phone
          ? `scaleX(${0.04 + 0.96 * r})`
          : `scaleY(${0.04 + 0.96 * r})`;
        rail.current.style.opacity = String(
          clamp(k / 0.07) * (1 - clamp((k - 0.55) / 0.45) * 0.72),
        );
      }
      const g = ease(clamp((k - 0.12) / 0.42));
      if (sheet.current) {
        sheet.current.style.transform = phone
          ? `scaleY(${0.008 + 0.992 * g})`
          : `scaleX(${0.008 + 0.992 * g})`;
        sheet.current.style.opacity = String(clamp(k / 0.09));
      }
      const b = ease(clamp((k - 0.2) / 0.24));
      for (const bracket of root.current?.querySelectorAll<HTMLElement>('.panel-bracket') ?? []) {
        bracket.style.transform = `scale(${0.2 + 0.8 * b})`;
        bracket.style.opacity = String(b);
      }
      const nodes = staged.current;
      const step = nodes.length > 1 ? (1 - 0.42 - 0.28) / (nodes.length - 1) : 0;
      nodes.forEach((node, i) => {
        const p = ease(clamp((k - 0.42 - i * step) / 0.28));
        node.style.opacity = String(p);
        node.style.transform = phone
          ? `translate3d(0, ${(1 - p) * 12}px, 0)`
          : `translate3d(${(1 - p) * 14}px, 0, 0)`;
      });
    },
    [phone],
  );

  /** Collects the nodes the stagger moves: the header, the band, each block, the composer. */
  const collect = useCallback(() => {
    const container = root.current;
    if (!container) return;
    staged.current = [
      ...container.querySelectorAll<HTMLElement>(
        '.panel-head, .panel-band, .panel-body > .panel-lead, .panel-body > .panel-block, .panel-composer',
      ),
    ];
  }, []);

  // The entry. Runs when the target changes; instant under reduced motion.
  useLayoutEffect(() => {
    if (!target) return;
    collect();
    if (reduced.current) {
      frame(1);
      return;
    }
    const started = performance.now();
    frame(0);
    const tick = () => {
      const k = Math.min(1, (performance.now() - started) / (OPEN_SECONDS * 1000));
      frame(k);
      if (k < 1) raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    // Only the entry's handle: cancelling the exit's here is the defect
    // described above.
    return () => cancelAnimationFrame(raf.current);
  }, [target, frame, collect]);

  // Both handles on unmount, so a panel that leaves with the page does not
  // leave a frame callback behind.
  useEffect(
    () => () => {
      cancelAnimationFrame(raf.current);
      cancelAnimationFrame(exitRaf.current);
    },
    [],
  );

  // The exit: the mirror of the entry. The ground closes back to the line
  // and the line to a point, which is the collapse the consoles do.
  const close = useCallback(() => {
    if (!target) return;
    if (reduced.current) {
      setLeaving(null);
      onClose();
      return;
    }
    setLeaving(target);
    onClose();
    // The entry, if one is still running, is over.
    cancelAnimationFrame(raf.current);
    const started = performance.now();
    const tick = () => {
      const k = Math.min(1, (performance.now() - started) / (CLOSE_SECONDS * 1000));
      frame(1 - k);
      if (k < 1) exitRaf.current = requestAnimationFrame(tick);
      else setLeaving(null);
    };
    exitRaf.current = requestAnimationFrame(tick);
  }, [target, onClose, frame]);

  // Esc closes the panel and nothing else: back is one step per level, so
  // the next Esc is `VirgilRoom`'s and returns to the wide view.
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

  // The scroll rail's thumb, from the body's own scroll.
  useEffect(() => {
    const scroller = body.current;
    const track = scrollRail.current;
    const thumb = railThumb.current;
    if (!scroller || !track || !thumb) return;
    const update = () => {
      const view = scroller.clientHeight;
      const total = scroller.scrollHeight;
      if (total <= view + 1) {
        track.style.opacity = '0';
        return;
      }
      track.style.opacity = '1';
      const height = Math.max(24, (view / total) * track.clientHeight);
      thumb.style.height = `${height}px`;
      thumb.style.transform = `translateY(${
        (scroller.scrollTop / (total - view)) * (track.clientHeight - height)
      }px)`;
    };
    scroller.addEventListener('scroll', update, { passive: true });
    const observer = new ResizeObserver(update);
    observer.observe(scroller);
    update();
    return () => {
      scroller.removeEventListener('scroll', update);
      observer.disconnect();
    };
  }, [doc]);

  // A phone dismisses by dragging the panel down. Compositor only while
  // the finger is down, and the mirror of the entry once it lets go.
  const drag = useRef<{ from: number; active: boolean }>({ from: 0, active: false });
  const onPointerDown = (event: React.PointerEvent) => {
    if (!phone || event.pointerType === 'mouse') return;
    if ((body.current?.scrollTop ?? 0) > 0) return;
    drag.current = { from: event.clientY, active: true };
  };
  const onPointerMove = (event: React.PointerEvent) => {
    if (!drag.current.active || !sheet.current) return;
    const dy = Math.max(0, event.clientY - drag.current.from);
    sheet.current.style.transform = `translate3d(0, ${dy}px, 0)`;
    sheet.current.style.opacity = String(Math.max(0, 1 - dy / 420));
  };
  const onPointerUp = (event: React.PointerEvent) => {
    if (!drag.current.active || !sheet.current) return;
    const dy = Math.max(0, event.clientY - drag.current.from);
    drag.current.active = false;
    if (dy > 90) close();
    else {
      sheet.current.style.transform = 'scaleY(1)';
      sheet.current.style.opacity = '1';
    }
  };

  if (!shown || !doc) return null;
  return (
    <div
      className="panel-root"
      ref={root}
      style={{ '--panel-tint': doc.tint } as React.CSSProperties}
      /*
       * **The panel is not part of the world, and its presses must not
       * reach it** (V10, defect B).
       *
       * `<Canvas>` connects its pointer events to the canvas's *parent*
       * element, which is `.room-stage` — and this panel is inside it. So
       * every press on the panel was also raycast into the scene: a press
       * that hit nothing ran `onPointerMissed`, which re-frames the camera
       * to the wide view, and a press over a screen behind the panel
       * opened that screen's document. Pressing the panel's own close
       * control started a 0.9 s camera flight, and the flight is why the
       * panel looked as though it had not closed.
       *
       * Stopping the pointer events here — not the click, which React's
       * own handlers need — keeps the world's raycaster out of the panel
       * without touching how the canvas is wired.
       */
      onPointerDown={(event) => event.stopPropagation()}
      onPointerUp={(event) => event.stopPropagation()}
    >
      <div className="panel-rail" ref={rail} />
      <section
        className="panel"
        ref={sheet}
        aria-label={`${doc.title} — ${doc.band ? 'a recorded run, replayed; not live state' : 'illustrative, not real state'}`}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        <span className="panel-bracket tr" />
        <span className="panel-bracket br" />
        <header className="panel-head">
          <span className="panel-grab" />
          <div className="panel-head-identity">
            <div className="panel-kicker">{doc.kicker}</div>
            <h2 className="panel-title">{doc.title}</h2>
            <p className="panel-state">{doc.state}</p>
          </div>
          <div className="panel-mark">
            <Mark report={doc.mark.report} tint={doc.tint} size={phone ? 40 : 56} />
            <span className="panel-mark-word">{doc.mark.word}</span>
          </div>
          <button className="panel-back" type="button" onClick={close}>
            ESC
          </button>
        </header>
        {/* The honesty marking: prominent, at full width, on every
            document, directly under the header — never a footnote.

            **Two modes, two markings, and never the wrong one.** The
            scripted demonstration's words are here; the replay carries its
            own on the document, because a recorded run played back is real
            evidence and calling it illustrative would understate the truth
            as badly as dropping the band would overstate it. Same place,
            same prominence, same amber. */}
        <div className="panel-band">
          {doc.band ? (
            <>
              <b>{doc.band.title}</b>
              <span>{doc.band.note}</span>
            </>
          ) : (
            <>
              <b>Illustrative · not real state</b>
              <span>
                A scripted demonstration. No event, no check and no review drives anything below.
              </span>
            </>
          )}
        </div>
        <div className="panel-body" ref={body}>
          <div className="panel-scrollrail" ref={scrollRail}>
            <i ref={railThumb} />
          </div>
          <p className="panel-lead">{doc.lead}</p>
          {doc.sections.map((section) => (
            <section
              className={`panel-block${section.wide ? ' wide' : ''}`}
              key={`${doc.key}:${section.title}`}
            >
              <h3 className="panel-section-title">{section.title}</h3>
              {section.kind === 'lines' ? (
                <ul className="panel-lines">
                  {section.rows.map((row) => (
                    <li key={row.cells[0]}>{row.cells[0]}</li>
                  ))}
                </ul>
              ) : (
                <table className={`panel-table ${tableShape(section)}`}>
                  {section.head ? (
                    <thead>
                      <tr>
                        {section.head.map((cell) => (
                          <th key={cell}>{cell}</th>
                        ))}
                      </tr>
                    </thead>
                  ) : null}
                  <tbody>
                    {section.rows.map((row) => (
                      <tr key={row.cells.join('|')}>
                        {row.cells.map((cell, i) => (
                          <td key={`${row.cells[0]}:${i}`} className={cellShape(cell)}>
                            {row.tag && row.tag.at === i ? (
                              <span className={`panel-chip ${row.tag.kind}`}>{cell}</span>
                            ) : (
                              cell
                            )}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </section>
          ))}
          <section className="panel-block">
            <h3 className="panel-section-title">Evidence</h3>
            <div className="panel-evidence-row">
              {doc.evidence.map((entry) => (
                <span key={entry}>{entry}</span>
              ))}
            </div>
          </section>
          {/* Where every figure above came from. The replay's rule: each
              document names the file, the part of it, and the commit. */}
          {doc.provenance ? (
            <section className="panel-block wide">
              <h3 className="panel-section-title">Where this comes from</h3>
              <table className="panel-table panel-table-columns panel-table-sources">
                <thead>
                  <tr>
                    <th>DOCUMENT</th>
                    <th>SECTION</th>
                    <th>COMMIT</th>
                  </tr>
                </thead>
                <tbody>
                  {doc.provenance.map((source) => (
                    <tr key={`${source.document}:${source.section}`}>
                      <td>{source.document}</td>
                      <td>{source.section}</td>
                      <td>{source.commit}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          ) : null}
        </div>
        <div className="panel-foot">
          {/* Present, typeable, and honest: it is not connected to a
              session, it never pretends to have sent anything, and what is
              typed is kept (§5a, decision 3). */}
          <form className="panel-composer" onSubmit={(event) => event.preventDefault()}>
            <label htmlFor="panel-composer-input">Not connected to a session</label>
            <textarea
              id="panel-composer-input"
              value={typed}
              placeholder="Ask Virgil to plan, inspect or explain anything…"
              onChange={(event) => setTyped(event.target.value)}
            />
            <div className="panel-note">
              Kept on this page. Nothing is sent: there is no session behind this build.
            </div>
          </form>
        </div>
      </section>
    </div>
  );
}

/**
 * The verdict's own mark, as an SVG, drawn from the same rules as
 * `screens/verdicts.ts`: twelve segments; broken on every third for
 * BLOCKED; outlined with a gap for INSUFFICIENT_EVIDENCE; a thin open
 * circle for a claim. Geometry, not colour alone, as `REVIEW_POLICY.md`
 * requires.
 */
function Mark({
  report,
  tint,
  size,
}: {
  report: PanelDoc['mark']['report'];
  tint: string;
  size: number;
}) {
  const c = size / 2;
  const r = c - Math.max(4, size * 0.1);
  const claim = report === 'COMPLETE' || report === '—';
  const broken = report === 'BLOCKED';
  const hollow = report === 'INSUFFICIENT_EVIDENCE';
  const colour = report === '—' ? tint : verdictLook(report).tint;
  const segments: string[] = [];
  for (let k = 0; k < 12; k += 1) {
    if (broken && k % 3 === 1) continue;
    if (hollow && (k === 0 || k === 11)) continue;
    const a0 = -Math.PI / 2 + (k / 12) * Math.PI * 2;
    const a1 = a0 + Math.PI / 6 - 0.09;
    segments.push(
      `M ${(c + Math.cos(a0) * r).toFixed(2)} ${(c + Math.sin(a0) * r).toFixed(2)} A ${r.toFixed(2)} ${r.toFixed(2)} 0 0 1 ${(c + Math.cos(a1) * r).toFixed(2)} ${(c + Math.sin(a1) * r).toFixed(2)}`,
    );
  }
  const width = claim ? size * 0.05 : hollow ? size * 0.075 : size * 0.14;
  const tickSize = r * 0.78;
  return (
    <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size} aria-hidden="true">
      {segments.map((d) => (
        <path
          key={d}
          d={d}
          stroke={colour}
          strokeWidth={width}
          fill="none"
          opacity={claim ? 0.9 : 1}
        />
      ))}
      {report === 'PASS' || report === 'PASS_WITH_NON_BLOCKING_FINDINGS' ? (
        <path
          d={`M ${c - tickSize / 2} ${c + tickSize * 0.02} L ${c - tickSize * 0.14} ${c + tickSize * 0.36} L ${c + tickSize / 2} ${c - tickSize * 0.36}`}
          stroke={colour}
          strokeWidth={tickSize * 0.22}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      ) : null}
      {broken ? (
        <>
          <path
            d={`M ${c - r * 0.34} ${c - r * 0.34} L ${c + r * 0.34} ${c + r * 0.34}`}
            stroke={colour}
            strokeWidth={r * 0.17}
            strokeLinecap="round"
          />
          <path
            d={`M ${c + r * 0.34} ${c - r * 0.34} L ${c - r * 0.34} ${c + r * 0.34}`}
            stroke={colour}
            strokeWidth={r * 0.17}
            strokeLinecap="round"
          />
        </>
      ) : null}
      {hollow ? (
        <>
          <path
            d={`M ${c - r * 0.1} ${c - r * 0.3} L ${c - r * 0.34} ${c - r * 0.3} L ${c - r * 0.34} ${c + r * 0.3} L ${c - r * 0.1} ${c + r * 0.3}`}
            stroke={colour}
            strokeWidth={r * 0.1}
            fill="none"
          />
          <path
            d={`M ${c + r * 0.1} ${c - r * 0.3} L ${c + r * 0.34} ${c - r * 0.3} L ${c + r * 0.34} ${c + r * 0.3} L ${c + r * 0.1} ${c + r * 0.3}`}
            stroke={colour}
            strokeWidth={r * 0.1}
            fill="none"
          />
        </>
      ) : null}
    </svg>
  );
}

/**
 * **Which of the two table layouts a section gets** (V10 repair).
 *
 * A table of exactly two columns is a label and a value, and gets
 * `panel-table-pairs`: the label absorbs the slack, the value sits
 * against the right edge. Every other shape — one column of paths, the
 * findings' four, the windows' four, the provenance's three — gets
 * `panel-table-columns` and lays itself out, because the two-column rule
 * collapsed their first column to nothing and pushed their last one off
 * the edge of the window. `panel.css` carries the measurements and the
 * reasoning.
 *
 * Counted from the widest row rather than from the head, because a
 * section may have rows and no head.
 */
export function tableShape(section: {
  head?: readonly string[];
  rows: readonly { cells: readonly string[] }[];
}): string {
  const columns = Math.max(
    section.head?.length ?? 0,
    ...section.rows.map((row) => row.cells.length),
    1,
  );
  return columns === 2 ? 'panel-table-pairs' : 'panel-table-columns';
}

/**
 * **A short cell with no space in it is one thing and stays on one line.**
 *
 * A cell wraps, which is how nothing is cut off; but a line break inside
 * an identity makes it read as two. `KR-01` broke after its hyphen —
 * every line-breaking algorithm offers a break there — and came out as
 * `KR-` above `01`. Twelve characters is the width of the longest of
 * them and narrow enough that holding it on one line can never push a
 * table past its panel.
 */
function cellShape(cell: string): string | undefined {
  return cell.length <= 12 && !/\s/.test(cell) ? 'panel-cell-token' : undefined;
}

/** Whether the panel is at its phone size. Matches `panel.css`'s one query. */
function usePhone(): boolean {
  const [phone, setPhone] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(max-width: 620px)').matches,
  );
  useEffect(() => {
    const query = window.matchMedia('(max-width: 620px)');
    const onChange = () => setPhone(query.matches);
    query.addEventListener('change', onChange);
    return () => query.removeEventListener('change', onChange);
  }, []);
  return phone;
}
