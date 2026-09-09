import type { Block, Standing } from './blocks.js';

/**
 * **One renderer per block kind, and a small Markdown subset.**
 *
 * The blocks are the architecture (`blocks.ts`); this file is the only place
 * that decides what one looks like. A real transcript later produces the same
 * blocks from a different source and this file does not change — which is the
 * whole reason the window is not authored HTML per agent.
 *
 * **Typography rule, and it is a deliberate departure.** Conversation text is
 * proportional system type in ordinary sentence case. Monospace is reserved for
 * what is literally a token: a path, a command, a SHA, a candidate state, a
 * verdict, terminal output, code. There are no giant uppercase headings for
 * ordinary content, which is a real change from the in-world screens' voice
 * (`window.css` carries the rule and `test/window-v11.test.ts` holds it).
 */

/** The one Markdown subset: `**bold**`, `` `code` ``, `- ` bullets, `> ` quotes. */
function inline(text: string, keyPrefix: string): (string | React.ReactElement)[] {
  const out: (string | React.ReactElement)[] = [];
  const pattern = /(\*\*[^*]+\*\*|`[^`]+`)/g;
  let last = 0;
  let match = pattern.exec(text);
  let index = 0;
  while (match !== null) {
    if (match.index > last) out.push(text.slice(last, match.index));
    const token = match[0];
    index += 1;
    if (token.startsWith('**')) {
      out.push(<b key={`${keyPrefix}-b${index}`}>{token.slice(2, -2)}</b>);
    } else {
      out.push(<code key={`${keyPrefix}-c${index}`}>{token.slice(1, -1)}</code>);
    }
    last = match.index + token.length;
    match = pattern.exec(text);
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

function Markdown({ markdown }: { markdown: string }) {
  const lines = markdown.split('\n');
  const nodes: React.ReactElement[] = [];
  let bullets: string[] = [];
  const flush = (at: number) => {
    if (bullets.length === 0) return;
    nodes.push(
      <ul className="v11w-bullets" key={`ul-${at}`}>
        {bullets.map((item, i) => (
          <li key={item}>{inline(item, `li-${at}-${i}`)}</li>
        ))}
      </ul>,
    );
    bullets = [];
  };
  for (const [i, raw] of lines.entries()) {
    const line = raw.trimEnd();
    if (line.startsWith('- ')) {
      bullets.push(line.slice(2));
      continue;
    }
    flush(i);
    if (line.length === 0) continue;
    if (line.startsWith('> ')) {
      nodes.push(
        <blockquote className="v11w-quote" key={`q-${i}`}>
          {inline(line.slice(2), `q-${i}`)}
        </blockquote>,
      );
      continue;
    }
    nodes.push(
      <p className="v11w-para" key={`p-${i}`}>
        {inline(line, `p-${i}`)}
      </p>,
    );
  }
  flush(lines.length);
  return <>{nodes}</>;
}

const STANDING_WORD: Record<Standing, string> = {
  verified: 'Verified',
  claim: 'Claim',
  unresolved: 'Not known',
};

export function BlockView({ block, id }: { block: Block; id: string }) {
  switch (block.kind) {
    case 'para':
      return <p className="v11w-para">{block.text}</p>;
    case 'markdown':
      return <Markdown markdown={block.markdown} />;
    case 'code':
      return (
        <figure className="v11w-card v11w-code">
          {block.path ? <figcaption className="v11w-card-head">{block.path}</figcaption> : null}
          <pre>
            <code>{block.lines.join('\n')}</code>
          </pre>
        </figure>
      );
    case 'terminal':
      return (
        <figure className="v11w-card v11w-terminal">
          <figcaption className="v11w-card-head">
            <span className="v11w-prompt" aria-hidden="true">
              $
            </span>
            {block.command}
          </figcaption>
          <pre>
            {block.lines.map((line) => (
              <span className={line.stream === 'err' ? 'is-err' : undefined} key={line.text}>
                {line.text}
                {'\n'}
              </span>
            ))}
          </pre>
          {block.exit === undefined ? null : (
            <footer className={`v11w-exit${block.exit === 0 ? '' : ' is-bad'}`}>
              exit {block.exit}
            </footer>
          )}
        </figure>
      );
    case 'plan':
      return (
        <ol className="v11w-plan">
          {block.steps.map((step) => (
            <li className={`is-${step.state}`} key={step.text}>
              <span className="v11w-plan-mark" aria-hidden="true" />
              <span>{step.text}</span>
              <span className="v11w-sr">
                {step.state === 'done'
                  ? ' (done)'
                  : step.state === 'active'
                    ? ' (in progress)'
                    : ' (not started)'}
              </span>
            </li>
          ))}
        </ol>
      );
    case 'files':
      return (
        <ul className="v11w-files">
          {block.rows.map((row) => (
            <li key={row.path}>
              <span className={`v11w-tag is-${row.status}`}>{row.status}</span>
              <code className="v11w-path">{row.path}</code>
              <span className="v11w-plus">+{row.plus}</span>
            </li>
          ))}
        </ul>
      );
    case 'commits':
      return (
        <ul className="v11w-commits">
          {block.rows.map((row) => (
            <li key={row.sha}>
              <code className="v11w-sha">{row.sha}</code>
              <span>{row.subject}</span>
            </li>
          ))}
        </ul>
      );
    case 'branch':
      return (
        <div className="v11w-card v11w-branch">
          <div className="v11w-branch-row">
            <span className="v11w-label">branch</span>
            <code>{block.branch}</code>
          </div>
          <div className="v11w-branch-row">
            <span className="v11w-label">base</span>
            <code>{block.base}</code>
          </div>
          <div className="v11w-branch-row">
            <span className="v11w-label">head</span>
            <code>{block.head}</code>
          </div>
          <p className="v11w-fine">{block.note}</p>
        </div>
      );
    case 'diff':
      return (
        <figure className="v11w-card v11w-diff">
          <figcaption className="v11w-card-head">{block.path}</figcaption>
          <div className="v11w-hunk">{block.hunk}</div>
          <pre>
            {block.lines.map((line, i) => (
              <span
                className={line.sign === '+' ? 'is-add' : line.sign === '-' ? 'is-del' : undefined}
                key={`${id}-d${i}`}
              >
                {line.sign}
                {line.text}
                {'\n'}
              </span>
            ))}
          </pre>
        </figure>
      );
    case 'pr':
      return (
        <div className="v11w-card v11w-pr">
          <div className="v11w-card-head">
            <span className="v11w-tag is-draft">{block.state}</span>
            {block.title}
          </div>
          <p className="v11w-fine">{block.identity}</p>
          {block.lines.map((line) => (
            <p className="v11w-para" key={line}>
              {line}
            </p>
          ))}
        </div>
      );
    case 'checks':
      return (
        <ul className="v11w-checks">
          {block.rows.map((row) => (
            <li className={`is-${row.state}`} key={row.name}>
              <span className="v11w-check-mark" aria-hidden="true" />
              <span className="v11w-check-name">{row.name}</span>
              <span className="v11w-check-state">{row.state}</span>
            </li>
          ))}
        </ul>
      );
    case 'findings':
      return (
        <ul className="v11w-findings">
          {block.rows.map((row) => (
            <li key={row.id}>
              <code className="v11w-sha">{row.id}</code>
              <span className={`v11w-tag is-${row.severity}`}>{row.severity}</span>
              <span className="v11w-fine">{row.where}</span>
            </li>
          ))}
        </ul>
      );
    case 'evidence':
      return (
        <ul className="v11w-evidence">
          {block.rows.map((row) => (
            <li key={`${row.label}:${row.value}`}>
              <span className={`v11w-standing is-${row.standing}`}>
                {STANDING_WORD[row.standing]}
              </span>
              <span className="v11w-label">{row.label}</span>
              <span>{row.value}</span>
            </li>
          ))}
        </ul>
      );
    case 'facts':
      return (
        <ul className="v11w-facts">
          {block.rows.map((row) => (
            <li className={`is-${row.standing}`} key={row.text}>
              <span className={`v11w-standing is-${row.standing}`}>
                {STANDING_WORD[row.standing]}
              </span>
              <span>{row.text}</span>
            </li>
          ))}
        </ul>
      );
    case 'tools':
      return (
        <ul className="v11w-tools">
          {block.rows.map((row) => (
            <li
              className={row.running ? 'is-running' : undefined}
              key={`${row.tool}:${row.detail}`}
            >
              {/* The gentle animated orbital indicator: one ring, transform
                  only, and stopped entirely under reduced motion. */}
              <span className="v11w-orbit" aria-hidden="true">
                <i />
              </span>
              <span className="v11w-tool">{row.tool}</span>
              <code className="v11w-path">{row.detail}</code>
              <span className="v11w-fine">{row.running ? 'running' : 'done'}</span>
            </li>
          ))}
        </ul>
      );
    case 'attachment':
      return (
        <div className="v11w-attach">
          <span className="v11w-clip" aria-hidden="true">
            ⧉
          </span>
          <code className="v11w-path">{block.name}</code>
          <p className="v11w-fine">{block.note}</p>
        </div>
      );
    case 'image':
      return (
        <figure className="v11w-shot">
          <div
            className="v11w-shot-frame"
            style={{ '--shot-tint': block.tint } as React.CSSProperties}
            aria-hidden="true"
          />
          <figcaption>
            <code className="v11w-path">{block.label}</code>
            <span className="v11w-fine">{block.note}</span>
          </figcaption>
        </figure>
      );
    case 'decision':
      return (
        <div className="v11w-decision">
          <p className="v11w-decision-q">{block.question}</p>
          <ul>
            {block.options.map((option) => (
              <li key={option}>{option}</li>
            ))}
          </ul>
          <p className="v11w-fine">{block.note}</p>
        </div>
      );
    case 'table':
      return (
        <div className="v11w-table-wrap">
          {/*
           * **Two columns is a label and a value and stays two columns; three
           * or more stacks.** V9's panel learned the same lesson from the other
           * direction (`panel/Panel.tsx`, `tableShape`). Here it was found by
           * looking: stacking a two-column table repeated its own column heads
           * above every cell — `WHAT / Candidate`, `STATE / SAFE_TO_MERGE` —
           * which is twice the ink for half the sense.
           */}
          <table className={`v11w-table${block.head.length <= 2 ? ' is-pairs' : ''}`}>
            <thead>
              <tr>
                {block.head.map((cell) => (
                  <th key={cell}>{cell}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {block.rows.map((row) => (
                <tr key={row.join('|')}>
                  {row.map((cell, i) => (
                    /* `data-head` is what lets a narrow viewport stack a table
                       into labelled rows in CSS alone. A table that scrolls
                       sideways instead would put content outside the viewport,
                       which `verify:owner:v11` fails the build for — and
                       rightly, because a phone reader cannot find it. */
                    <td key={`${id}-${row[0]}-${i}`} data-head={block.head[i] ?? ''}>
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    case 'note':
      return <p className="v11w-note">{block.text}</p>;
    default:
      return null;
  }
}
