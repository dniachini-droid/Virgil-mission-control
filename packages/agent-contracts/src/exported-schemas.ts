import { schemaRegistry } from './index.js';
import { Conversation, SessionStatusReport } from './live.js';

/**
 * **Every schema that is written to `/schemas`, which is not the same set as
 * every schema the barrel exports.**
 *
 * `src/index.ts` is what the application imports, and V10's Owner Build compiles
 * it. Anything re-exported there is reachable from V10's bundle whether V10 uses
 * it or not: adding Phase 2 slice two's `SessionStatusReport` to that barrel put
 * **914 bytes into a build whose byte count may not move**, and the preservation
 * contract caught it on the next build.
 *
 * So the barrel carries what the application needs and this file carries what
 * the repository publishes. Both `scripts/export-schemas.ts` and
 * `test/schemas.test.ts` read this one, so the exported set and the asserted set
 * cannot drift apart — which is the failure that would otherwise replace the one
 * being avoided.
 */
export const exportedSchemas = {
  ...schemaRegistry,
  'session-status-report': SessionStatusReport,
  // Phase 2 slice six: what the owner asked and what Virgil answered. Published
  // because the reply is a claim the owner is invited to check, and a claim
  // nobody can check the shape of is the thing this repository publishes
  // schemas to prevent.
  conversation: Conversation,
} as const;

export type ExportedSchemaName = keyof typeof exportedSchemas;
