import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { z } from 'zod';
import { schemaRegistry } from '../src/index.js';
// Imported straight from the module rather than through the barrel: the barrel is
// what V10's Owner Build compiles, and adding this schema to it moved V10 by 914
// bytes. See the note at the foot of `src/index.ts`.
import { SessionStatusReport } from '../src/live.js';

const outDir = resolve(import.meta.dirname, '../../../schemas');
mkdirSync(outDir, { recursive: true });
const registry = {
  ...schemaRegistry,
  'session-status-report': SessionStatusReport,
};
const names = Object.keys(registry).sort();
for (const name of names) {
  const schema = registry[name as keyof typeof registry];
  const json = z.toJSONSchema(schema, {
    target: 'draft-2020-12',
    unrepresentable: 'any',
    io: 'input',
  });
  const doc = {
    $id: `https://virgil.local/schemas/${name}.schema.json`,
    title: name,
    ...json,
  };
  writeFileSync(resolve(outDir, `${name}.schema.json`), `${JSON.stringify(doc, null, 2)}\n`);
}
writeFileSync(
  resolve(outDir, 'README.md'),
  `# Schemas\n\nGenerated from \`packages/agent-contracts/src\` by \`pnpm --filter @virgil/agent-contracts export-schemas\`. Do not edit by hand; edit the Zod source and regenerate. JSON Schema draft 2020-12.\n\n${names.map((n) => `- \`${n}.schema.json\``).join('\n')}\n`,
);
console.log(`exported ${names.length} schemas to ${outDir}`);
