import { z } from 'zod';
import authority from '../../../constitution/authority.json' with { type: 'json' };
import matrix from '../../../constitution/permission-matrix.json' with { type: 'json' };
import { isValidRepoPath, isValidRepoPathPattern } from './paths.js';

export const Sha = z
  .string()
  .regex(/^[0-9a-f]{40}$/, 'full 40-hex commit SHA')
  .describe('Immutable full commit SHA');
export const ShortSha = z.string().regex(/^[0-9a-f]{7,12}$/);
export const Timestamp = z.iso
  .datetime({ offset: true })
  .describe('ISO-8601 timestamp with offset');
export const Id = z.string().min(1).max(200);
/** Concrete repository-relative path: normalisable, no traversal, no globs (see paths.ts). */
export const RepoPath = z
  .string()
  .min(1)
  .refine(isValidRepoPath, 'repository-relative path without traversal, absolute prefix or globs');
/** Permitted-path pattern: a normalisable path, directory prefix or `*`/`**` glob without traversal. */
export const RepoPathPattern = z
  .string()
  .min(1)
  .refine(isValidRepoPathPattern, 'repository-relative path pattern without traversal');
export const ContentHash = z
  .string()
  .regex(/^sha256:[0-9a-f]{64}$/)
  .describe('sha256 content hash');

export const roleIds = matrix.roles.map((r) => r.id) as [string, ...string[]];
export const RoleId = z
  .enum(roleIds)
  .describe('Agent role identifier from constitution/permission-matrix.json');
export const ActorKind = z.enum([
  'owner',
  'virgil',
  'agent',
  'system',
  'git',
  'github',
  'knowledge_worker',
]);
export const Actor = z.object({
  kind: ActorKind,
  roleId: RoleId.optional(),
  sessionId: Id.optional(),
  displayName: z.string().optional(),
});

export const AuthorityTier = z.enum(Object.keys(authority.tiers) as [string, ...string[]]);
export const CandidateState = z.enum(authority.candidateStates as [string, ...string[]]);
export const DeploymentState = z.enum(authority.deploymentStates as [string, ...string[]]);
export const ReviewVerdict = z.enum(authority.reviewVerdicts as [string, ...string[]]);
export const CheckResult = z.enum(authority.checkResults as [string, ...string[]]);

export const EvidenceKind = z.enum([
  'git_object',
  'git_ref',
  'command_output',
  'check_run',
  'file_hash',
  'diff',
  'event',
  'pull_request',
  'raw_source',
  'owner_decision',
  'gate_decision',
  'review_report',
  'adjudication',
  'run_record',
  'wiki_page',
  'schema',
  'code_path',
  'adr',
]);
export const EvidenceRef = z
  .object({
    kind: EvidenceKind,
    ref: z
      .string()
      .min(1)
      .describe('Locator: SHA, path, event id, PR number, check id, URL-free identifier'),
    hash: ContentHash.optional(),
    description: z.string().optional(),
  })
  .describe('A pointer to inspectable machine or structured evidence. Prose is never evidence.');

export const PrIdentity = z.object({
  repository: z.string(),
  number: z.number().int().positive(),
  draft: z.boolean(),
  headSha: Sha,
  baseRef: z.string(),
});

export const Severity = z.enum(['blocking', 'major', 'minor', 'informational']);

export const CheckRun = z.object({
  checkId: Id,
  name: z.string(),
  commandClass: z.string().describe('Class of command, never the raw command with secrets'),
  required: z.boolean(),
  result: CheckResult,
  exitCode: z.number().int().optional(),
  startedAt: Timestamp.optional(),
  finishedAt: Timestamp.optional(),
  skipReason: z.string().optional(),
  evidence: z.array(EvidenceRef),
});

/** Fields every build, review and repair record retains where applicable (commission section 9). */
export const ChainContext = z.object({
  projectId: Id,
  repository: z.string(),
  branch: z.string().optional(),
  worktree: z.string().optional(),
  baseSha: Sha.optional(),
  headSha: Sha.optional(),
  pr: PrIdentity.optional(),
  roleId: RoleId.optional(),
  sessionId: Id.optional(),
  authorityTier: AuthorityTier.optional(),
  authorityGrantId: Id.optional(),
  permittedActions: z.array(z.string()).optional(),
  filesChanged: z.array(RepoPath).optional(),
  checksRun: z.array(CheckRun).optional(),
  checksSkipped: z.array(z.object({ checkId: Id, reason: z.string() })).optional(),
  /**
   * **What was deliberately left undone, and why.** The box this contract went
   * eight days without, found on 2026-09-13 by checking it against what a
   * review actually needs rather than against what a runtime would file.
   *
   * `checksSkipped` says what could not be run. This says what was not
   * attempted, which is a different admission and the one where scope
   * discipline becomes visible. A stage that reports neither has told a
   * reviewer only the parts that went well.
   */
  notDone: z.array(z.string()).optional(),
  findingIds: z.array(Id).optional(),
  handoffSource: RoleId.optional(),
  handoffDestination: RoleId.optional(),
  gateResult: z.enum(['pass', 'fail', 'insufficient_evidence']).optional(),
  stopReason: z.string().optional(),
  nextAction: z.string().describe('Exactly one recommended next action').optional(),
});

export type EvidenceRef = z.infer<typeof EvidenceRef>;
export type CheckRun = z.infer<typeof CheckRun>;
export type ChainContext = z.infer<typeof ChainContext>;
