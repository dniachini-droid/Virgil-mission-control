import { z } from 'zod';
import { CandidateState, CheckResult, EvidenceKind, Id, RoleId } from './common.js';
import { knowledgeEventTypes, operationalEventTypes } from './events.js';

export const AnimationLayer = z.enum([
  'tool_activity',
  'git_manufacturing',
  'governance_review',
  'knowledge',
  'ambient',
]);
export const EventTypeName = z.enum([...operationalEventTypes, ...knowledgeEventTypes] as [
  string,
  ...string[],
]);
export const World = z.enum(['foundry', 'mind', 'gateway']);

export const MotionSpec = z.object({
  description: z.string().min(20),
  durationMs: z.number().int().positive(),
  cameraHint: z.enum(['none', 'restrained_emphasis', 'follow_artifact', 'reveal_relationship']),
});

/** One entry of the Operational Animation Grammar (Amendment 1, section B). */
export const AnimationMapping = z.object({
  mappingId: Id,
  eventType: EventTypeName,
  layer: AnimationLayer.exclude(['ambient']),
  world: World,
  requiredEvidence: z
    .array(EvidenceKind)
    .describe(
      'Evidence kinds that must all be present on the event before this animation may play',
    ),
  anyOfEvidence: z
    .array(EvidenceKind)
    .optional()
    .describe('When present, at least one of these kinds must also be present on the event'),
  actorRole: z.union([
    RoleId,
    z.enum(['owner', 'virgil', 'system', 'git', 'github', 'knowledge_worker', 'any']),
  ]),
  source: z.string(),
  destination: z.string(),
  entity: z.string().describe('Operational entity or immutable artifact affected'),
  stateBefore: z.string(),
  transitionalState: z.string(),
  stateAfter: z.string(),
  fullMotion: MotionSpec,
  persistentVisual: z.string().min(20).describe('What remains visible after the motion ends'),
  reducedMotion: z.string().min(20),
  mobileLowPerformance: z.string().min(20),
  failureInterruption: z.string().min(20),
  replay: z.string().min(20),
  evidenceViewDestination: z.string(),
  soundHaptics: z.object({ optional: z.literal(true), motif: z.string().optional() }),
  mustNotResemble: z
    .array(z.string())
    .describe('Other mappings or states this must remain distinguishable from'),
});

export const AmbientAnimation = z.object({
  ambientId: Id,
  description: z.string(),
  world: World,
  requiresEvent: z.literal(false),
  claimsWork: z.literal(false),
  maxIntensity: z.enum(['very_low', 'low']),
  neverAttachedTo: z
    .array(z.string())
    .describe('Entities this ambient motion may never attach to (e.g. idle worker instruments)'),
});

export const OperationalAnimationGrammar = z.object({
  version: z.string(),
  mappings: z.array(AnimationMapping),
  ambient: z.array(AmbientAnimation),
  distinctStates: z.object({
    checkResults: z.array(CheckResult),
    candidateStates: z.array(CandidateState),
    deploymentStates: z.array(z.string()),
  }),
  invariants: z.array(z.string()),
});

export const RolePerformance = z.object({
  roleId: RoleId,
  name: z.string(),
  ensembleRole: z.string(),
  silhouette: z.string().min(30),
  station: z.string().min(30),
  instruments: z.array(z.string()).min(2),
  locomotion: z.string().min(20),
  workingRitual: z.string().min(30),
  handoffBehaviour: z.string().min(20),
  idleBehaviour: z.string().min(20),
  prohibitedActionRepresentation: z.string().min(20),
  recognisableWithoutColour: z.string().min(20),
  colourAccentToken: z.string(),
  neverTouches: z.array(z.string()),
});

export const RolePerformanceBible = z.object({
  version: z.string(),
  roles: z.array(RolePerformance).length(14),
});

export const AgentDefinitionFrontmatter = z.object({
  name: RoleId,
  description: z.string().min(40),
  tools: z.string(),
  model: z.string(),
});

export const PermissionMatrixRole = z.object({
  id: RoleId,
  name: z.string(),
  title: z.string(),
  kind: z.enum(['permanent', 'conditional']),
  stage: z.string(),
  activatedBy: z.array(z.string()).optional(),
  maxTier: z.string(),
  tools: z.array(z.string()).min(1),
  bashPolicy: z.string(),
  writeBoundaries: z.array(z.string()),
  mayModifyCandidate: z.boolean(),
  mayModifyTests: z.union([z.boolean(), z.string()]),
  mayLaunchStages: z.boolean(),
  independentOf: z.array(z.string()),
  prohibited: z.array(z.string()).min(1),
  stopConditions: z.array(z.string()).min(1),
  escalatesTo: z.enum(['owner', 'virgil', 'arbiter']),
  resultSchema: z.string(),
  payloadSchema: z.string(),
});
export const PermissionMatrix = z.object({
  version: z.string(),
  toolVocabulary: z.array(z.string()),
  roles: z.array(PermissionMatrixRole),
});

export const AuthorityConfig = z.object({
  version: z.string(),
  tiers: z.record(
    z.string(),
    z.object({
      title: z.string(),
      requiresOwnerDecision: z.union([z.boolean(), z.string()]),
      permittedActions: z.array(z.string()),
    }),
  ),
  ownerOnlyActions: z.array(z.string()),
  virgilProhibitions: z.array(z.string()),
  protectedBoundaries: z.array(z.string()),
  permissionInvariant: z.array(z.string()),
  repairLimits: z.object({
    independentReviewsPerCycle: z.number().int(),
    adjudicationsPerCycle: z.number().int(),
    boundedRepairsPerCycle: z.number().int(),
    reReviewsPerCycle: z.number().int(),
    maxCyclesWithoutOwner: z.number().int(),
    maxCyclesWithOwner: z.number().int(),
    beyondLimit: z.string(),
  }),
  reviewVerdicts: z.array(z.string()),
  candidateStates: z.array(z.string()),
  deploymentStates: z.array(z.string()),
  checkResults: z.array(z.string()),
  transitions: z.array(
    z.object({ from: z.string(), on: z.string(), to: z.string(), guard: z.string().optional() }),
  ),
});
