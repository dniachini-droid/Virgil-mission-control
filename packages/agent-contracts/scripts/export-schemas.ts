import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { z } from 'zod';
import { schemaRegistry } from '../src/index.js';

const outDir = resolve(import.meta.dirname, '../../../schemas');
mkdirSync(outDir, { recursive: true });
const names = Object.keys(schemaRegistry).sort();
for (const name of names) {
  const schema = schemaRegistry[name as keyof typeof schemaRegistry];
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
