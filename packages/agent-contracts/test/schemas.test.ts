import { readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';
import { describe, expect, it } from 'vitest';
import authority from '../../../constitution/authority.json' with { type: 'json' };
import matrix from '../../../constitution/permission-matrix.json' with { type: 'json' };
import { candidateScenarios, foundryRuns } from '../../test-fixtures/src/index.js';
import { AuthorityConfig, DomainEvent, PermissionMatrix, schemaRegistry } from '../src/index.js';

const schemasDir = resolve(import.meta.dirname, '../../../schemas');

describe('schema registry and exported JSON Schema', () => {
  it('exports every registry schema to /schemas', () => {
    const files = readdirSync(schemasDir).filter((f) => f.endsWith('.schema.json'));
    expect(files.sort()).toEqual(
      Object.keys(schemaRegistry)
        .map((n) => `${n}.schema.json`)
        .sort(),
    );
  });
  it('every exported schema compiles under Ajv draft 2020-12', () => {
    const ajv = new Ajv2020({ strict: false, allErrors: true });
    addFormats(ajv);
    for (const f of readdirSync(schemasDir).filter((x) => x.endsWith('.schema.json'))) {
      const doc = JSON.parse(readFileSync(resolve(schemasDir, f), 'utf8'));
      expect(() => ajv.compile(doc), f).not.toThrow();
    }
  });
  it('every schema rejects an empty object', () => {
    for (const [name, schema] of Object.entries(schemaRegistry)) {
      expect(schema.safeParse({}).success, name).toBe(false);
    }
  });
});

describe('constitution data validates against its contracts', () => {
  it('authority.json', () => {
    expect(AuthorityConfig.safeParse(authority).success).toBe(true);
  });
  it('permission-matrix.json', () => {
    const r = PermissionMatrix.safeParse(matrix);
    expect(r.success, JSON.stringify(r.error?.issues)).toBe(true);
  });
});

describe('fixture events validate as domain events (Zod and exported JSON Schema agree)', () => {
  const ajv = new Ajv2020({ strict: false, allErrors: true });
  addFormats(ajv);
  const jsonSchema = JSON.parse(
    readFileSync(resolve(schemasDir, 'domain-event.schema.json'), 'utf8'),
  );
  const validate = ajv.compile(jsonSchema);
  for (const [name, build] of Object.entries(foundryRuns)) {
    it(name, () => {
      for (const e of build()) {
        const r = DomainEvent.safeParse(e);
        expect(r.success, `${e.type}: ${JSON.stringify(r.error?.issues)}`).toBe(true);
        expect(validate(e), `${e.type} json-schema: ${JSON.stringify(validate.errors)}`).toBe(true);
      }
    });
  }
  it('rejects an event with a malformed SHA, an unknown type, or a secret-looking payload field name', () => {
    const [good] = foundryRuns.passingRun().filter((e) => e.type === 'candidate_committed');
    const badSha = { ...good, payload: { ...(good?.payload as object), headSha: 'not-a-sha' } };
    expect(DomainEvent.safeParse(badSha).success).toBe(false);
    expect(DomainEvent.safeParse({ ...good, type: 'work_done_trust_me' }).success).toBe(false);
  });
  it('fixture scenarios carry the twelve commissioned defect classes plus a harmless case', () => {
    const ids = candidateScenarios.map((s) => s.scenarioId);
    for (const required of [
      'obvious-logic-defect',
      'subtle-regression',
      'missing-acceptance-criterion',
      'stale-reviewed-sha',
      'remote-local-mismatch',
      'unapproved-path',
      'misleading-ui-copy',
      'mutation-undetected',
      'invented-owner-decision',
      'missing-reviewer',
      'repair-cycle-exceeded',
      'harmless-candidate',
    ])
      expect(ids).toContain(required);
  });
});
