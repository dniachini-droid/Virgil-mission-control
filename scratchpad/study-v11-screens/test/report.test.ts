import { appendFileSync, writeFileSync } from 'node:fs';
import { describe, it } from 'vitest';
import { ROLES } from '../../../apps/mission-control/src/world/room/cast.js';
import { bezelPlan } from '../../../apps/mission-control/src/world/screens/v11/bezel.js';

const OUT = '/home/user/Virgil-mission-control/scratchpad/study-v11-screens/bezel-measurements.txt';
writeFileSync(OUT, '');
const say = (s: string) => appendFileSync(OUT, `${s}\n`);

describe('bezel measurements', () => {
  it('reports', () => {
    for (const role of ROLES) {
      const p = bezelPlan(role);
      say(`== ${role}`);
      say(
        `  drawn opening        ${(2000 * p.drawn.halfWidth).toFixed(1)} x ${(2000 * p.drawn.halfHeight).toFixed(1)} mm, radius ${(1000 * p.drawn.radius).toFixed(1)} mm`,
      );
      say(
        `  plate inner opening  ${(2000 * p.innerHalfWidth).toFixed(1)} x ${(2000 * p.innerHalfHeight).toFixed(1)} mm, radius ${(1000 * p.innerRadius).toFixed(1)} mm`,
      );
      say(`  ring width           ${(1000 * p.ringWidth).toFixed(1)} mm`);
      say(`  picture lift         ${(1000 * p.pictureLift).toFixed(2)} mm`);
      say(`  lip offset           ${(1000 * p.offset).toFixed(2)} mm`);
      say(`  surround max height  ${(1000 * p.surfaceMaxFront).toFixed(2)} mm`);
      say(`  plate max height     ${(1000 * p.plateMaxFront).toFixed(2)} mm`);
      say(
        `  gap min / max        ${(1000 * p.minGap).toFixed(2)} / ${(1000 * p.maxGap).toFixed(2)} mm`,
      );
      say(`  outer edge gap       ${(1000 * p.edgeGap).toFixed(2)} mm`);
      say(`  max lift over ridge  ${(1000 * p.maxLift).toFixed(2)} mm`);
      say(
        `  samples              ${p.sampled}, missed ${p.missed} (${((100 * p.missed) / p.sampled).toFixed(1)} %)`,
      );
      say(`  covered per side     ${(1000 * p.coveredPerSide).toFixed(1)} mm`);
      say(
        `  surround profile     ${p.profile.map((r) => `${(1000 * r.at).toFixed(0)}mm: med ${(1000 * r.median).toFixed(1)} max ${(1000 * r.max).toFixed(1)}`).join(' | ')}`,
      );
      say('');
    }
  });
});
