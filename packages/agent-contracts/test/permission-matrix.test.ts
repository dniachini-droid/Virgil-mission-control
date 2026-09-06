import { readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import matrix from '../../../constitution/permission-matrix.json' with { type: 'json' };
import { AgentDefinitionFrontmatter, schemaRegistry } from '../src/index.js';

const agentsDir = resolve(import.meta.dirname, '../../../.claude/agents');
const roles = matrix.roles;
const byId = new Map(roles.map((r) => [r.id, r]));

function frontmatter(file: string): Record<string, string> {
  const text = readFileSync(resolve(agentsDir, file), 'utf8');
  const m = text.match(/^---\n([\s\S]*?)\n---/);
  const out: Record<string, string> = {};
  for (const line of (m?.[1] ?? '').split('\n')) {
    const i = line.indexOf(':');
    if (i > 0) out[line.slice(0, i).trim()] = line.slice(i + 1).trim();
  }
  return out;
}

describe('permission invariant (Amendment 1 correction)', () => {
  it('has seven permanent and seven conditional roles', () => {
    expect(roles.filter((r) => r.kind === 'permanent')).toHaveLength(7);
    expect(roles.filter((r) => r.kind === 'conditional')).toHaveLength(7);
  });
  it('exactly one role may modify the candidate, and every reviewer is independent of it', () => {
    const modifiers = roles.filter((r) => r.mayModifyCandidate);
    expect(modifiers.map((r) => r.id)).toEqual(['fabricator']);
    for (const r of roles.filter((x) => x.stage === 'review' || x.stage === 'adjudication')) {
      expect(r.mayModifyCandidate, r.id).toBe(false);
      expect(r.independentOf, r.id).toContain('fabricator');
      expect(
        r.writeBoundaries.some((w) => w.includes('worktree') || w.includes('permitted-paths')),
        r.id,
      ).toBe(false);
    }
  });
  it('Keeper and Arbiter cannot modify the candidate or tests', () => {
    for (const id of ['keeper', 'arbiter']) {
      const r = byId.get(id);
      expect(r?.mayModifyCandidate).toBe(false);
      expect(r?.mayModifyTests).toBe(false);
      expect(r?.writeBoundaries).toEqual([]);
    }
  });
  it('Virgil routes but never performs specialised work', () => {
    const v = byId.get('virgil');
    expect(v?.writeBoundaries).toEqual([]);
    expect(v?.mayModifyCandidate).toBe(false);
    expect(v?.mayLaunchStages).toBe(true);
    expect(v?.prohibited).toContain('perform_routed_work');
    expect(roles.filter((r) => r.mayLaunchStages).map((r) => r.id)).toEqual(['virgil']);
  });
  it('no role holds merge or deploy authority', () => {
    for (const r of roles) {
      expect(r.tools).not.toContain('Merge');
      expect(
        r.prohibited.includes('merge') ||
          r.stage === 'review' ||
          r.id === 'cartographer' ||
          r.id === 'architect',
        r.id,
      ).toBe(true);
    }
  });
  it('write boundaries do not overlap except by the sanctioned sequential Prover test grant', () => {
    const owners = new Map<string, string[]>();
    for (const r of roles)
      for (const w of r.writeBoundaries) owners.set(w, [...(owners.get(w) ?? []), r.id]);
    for (const [w, ids] of owners) expect(ids, w).toHaveLength(1);
    expect(byId.get('prover')?.writeBoundaries).toEqual(['<explicitly-authorised-test-boundary>']);
  });
  it('every role has stop conditions, an escalation target and existing result/payload schemas', () => {
    for (const r of roles) {
      expect(r.stopConditions.length, r.id).toBeGreaterThan(0);
      expect(['owner', 'virgil', 'arbiter']).toContain(r.escalatesTo);
      expect(Object.keys(schemaRegistry), `${r.id} result`).toContain(r.resultSchema);
      expect(Object.keys(schemaRegistry), `${r.id} payload`).toContain(r.payloadSchema);
    }
  });
  it('every role uses only vocabulary tools', () => {
    for (const r of roles)
      for (const t of r.tools) expect(matrix.toolVocabulary, `${r.id}:${t}`).toContain(t);
  });
});

describe('agent definitions agree with the matrix', () => {
  const files = readdirSync(agentsDir).filter((f) => f.endsWith('.md'));
  it('one definition per role, no extras', () => {
    expect(files.map((f) => f.replace(/\.md$/, '')).sort()).toEqual(roles.map((r) => r.id).sort());
  });
  for (const file of files) {
    it(`${file} frontmatter validates and tools match`, () => {
      const fm = frontmatter(file);
      const parsed = AgentDefinitionFrontmatter.safeParse(fm);
      expect(parsed.success, JSON.stringify(parsed.error?.issues)).toBe(true);
      const role = byId.get(fm.name ?? '');
      expect(role).toBeDefined();
      expect(fm.tools?.split(',').map((t) => t.trim())).toEqual(role?.tools);
      const body = readFileSync(resolve(agentsDir, file), 'utf8');
      for (const w of role?.writeBoundaries ?? []) expect(body).toContain(w);
      expect(body).toContain('## Stop conditions');
      expect(body).toContain('## Prohibited actions');
      expect(body).toContain('## Escalation');
      expect(body).toContain('Definition version');
    });
  }
});
