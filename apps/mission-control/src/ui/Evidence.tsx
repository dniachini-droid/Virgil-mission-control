import type { DomainEvent } from '@virgil/agent-contracts';
import type { AnimationRefusal } from '@virgil/visual-language';

interface Props {
  heading: string;
  event?: DomainEvent | undefined;
  state?: { label: string; colour: string } | undefined;
  fields: Array<[string, string | number | boolean | undefined]>;
  refusal?: AnimationRefusal | undefined;
  note?: string | undefined;
}

/** Evidence View: exact details for the selected object or step. Dense, exact, same world. */
export function Evidence({ heading, event, state, fields, refusal, note }: Props) {
  return (
    <div>
      <h2>{heading}</h2>
      {state ? (
        <p style={{ margin: '0 0 8px' }}>
          <span className="state" style={{ color: state.colour }}>
            {state.label}
          </span>
        </p>
      ) : null}
      <dl>
        {event ? (
          <>
            <dt>event</dt>
            <dd>
              {event.type} · seq {event.seq}
            </dd>
            <dt>actor</dt>
            <dd>
              {event.actor.kind}
              {event.actor.roleId ? ` · ${event.actor.roleId}` : ''}
              {event.actor.sessionId ? ` · ${event.actor.sessionId}` : ''}
            </dd>
            <dt>evidence</dt>
            <dd>
              {event.evidence.length
                ? event.evidence
                    .map((e) => `${e.kind}:${e.ref.length > 22 ? `${e.ref.slice(0, 22)}…` : e.ref}`)
                    .join(' · ')
                : '— none —'}
            </dd>
            <dt>grant</dt>
            <dd>{event.authorityGrantId ?? '— (tier 1 observation)'}</dd>
            <dt>durability</dt>
            <dd>{event.durability}</dd>
          </>
        ) : null}
        {fields.map(([k, v]) => (
          <span key={k} style={{ display: 'contents' }}>
            <dt>{k}</dt>
            <dd>{v === undefined ? '—' : String(v)}</dd>
          </span>
        ))}
      </dl>
      {refusal ? (
        <p className="refusal">
          animation refused: {refusal.reason}
          {refusal.missing ? ` — missing evidence: ${refusal.missing.join(', ')}` : ''}
        </p>
      ) : null}
      {note ? <p style={{ margin: '8px 0 0', color: 'var(--ash)' }}>{note}</p> : null}
    </div>
  );
}
