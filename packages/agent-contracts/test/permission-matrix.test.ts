import { readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import settings from '../../../.claude/settings.json' with { type: 'json' };
import authority from '../../../constitution/authority.json' with { type: 'json' };
import matrix from '../../../constitution/permission-matrix.json' with { type: 'json' };
import {
  AgentDefinitionFrontmatter,
  normaliseRepoPathPattern,
  patternsMayOverlap,
  schemaRegistry,
} from '../src/index.js';

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

/**
 * Tool and write-authority overlap. A role's tools, Bash policy, write boundaries and candidate
 * flags must tell one story, no two roles may hold nested concrete boundaries, no boundary may
 * reach a protected boundary from authority.json, and the session deny rules must cover every
 * path-shaped protected boundary for both Write and Edit.
 */
describe('tool and write-authority overlap', () => {
  const writeTools = new Set(['Edit', 'Write']);
  const placeholder = (w: string) => /^<.+>$/.test(w);
  const sanctionedPlaceholders: Record<string, string> = {
    '<assigned-worktree>/<permitted-paths-from-plan-or-repair-contract>': 'fabricator',
    '<explicitly-authorised-test-boundary>': 'prover',
    '<disposable-scratch-copy>': 'breaker',
  };
  const protectedPaths = authority.protectedBoundaries.filter((b) => b.includes('/'));

  it('a role has write tools if and only if it has a write boundary', () => {
    for (const r of roles) {
      const hasWriteTool = r.tools.some((t) => writeTools.has(t));
      expect(hasWriteTool, `${r.id}: tools ${r.tools.join(',')}`).toBe(
        r.writeBoundaries.length > 0,
      );
    }
  });
  it('only a role that may modify the candidate holds a boundary inside the candidate worktree', () => {
    for (const r of roles) {
      const inCandidate = r.writeBoundaries.some(
        (w) => w.includes('worktree') || w.includes('permitted-paths'),
      );
      expect(inCandidate, r.id).toBe(r.mayModifyCandidate === true);
      if (r.mayModifyTests !== false)
        expect(
          r.tools.some((t) => writeTools.has(t)),
          `${r.id} modifies tests`,
        ).toBe(true);
      if (r.bashPolicy === 'none' || r.bashPolicy.startsWith('read-only'))
        expect(r.mayModifyCandidate, `${r.id} bash ${r.bashPolicy}`).toBe(false);
    }
  });
  it('stage launching is exclusive to the role holding the Agent tool', () => {
    for (const r of roles) expect(r.tools.includes('Agent'), r.id).toBe(r.mayLaunchStages);
  });
  it('placeholder boundaries are the three sanctioned ones, each held by one role', () => {
    for (const r of roles)
      for (const w of r.writeBoundaries.filter(placeholder))
        expect(sanctionedPlaceholders[w], `${r.id}: ${w}`).toBe(r.id);
    for (const [w, id] of Object.entries(sanctionedPlaceholders))
      expect(byId.get(id)?.writeBoundaries, id).toContain(w);
  });
  it('concrete boundaries normalise, never nest across roles and never reach a protected boundary', () => {
    const concrete: Array<[string, string]> = [];
    for (const r of roles)
      for (const w of r.writeBoundaries.filter((x) => !placeholder(x))) {
        const n = normaliseRepoPathPattern(w);
        expect(n.ok, `${r.id}: ${w}`).toBe(true);
        if (n.ok) concrete.push([n.path, r.id]);
      }
    expect(concrete.length).toBeGreaterThan(0);
    for (const [a, ra] of concrete)
      for (const [b, rb] of concrete)
        if (ra !== rb) expect(patternsMayOverlap(a, b), `${ra}:${a} vs ${rb}:${b}`).toBe(false);
    for (const [w, id] of concrete)
      for (const boundary of protectedPaths)
        expect(patternsMayOverlap(w, boundary), `${id}:${w} vs protected ${boundary}`).toBe(false);
  });
  it('session deny rules cover Write and Edit for every path-shaped protected boundary', () => {
    const deny = new Set(settings.permissions.deny);
    const rule = (b: string) => {
      const n = normaliseRepoPathPattern(b);
      expect(n.ok, b).toBe(true);
      if (!n.ok) return b;
      return n.path.endsWith('/') ? `./${n.path}**` : `./${n.path}`;
    };
    for (const b of protectedPaths) {
      const target = rule(b);
      expect(deny, `Write(${target})`).toContain(`Write(${target})`);
      expect(deny, `Edit(${target})`).toContain(`Edit(${target})`);
    }
    expect(protectedPaths.length).toBeGreaterThanOrEqual(5);
  });
});
