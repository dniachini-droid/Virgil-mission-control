/**
 * Idle motion for a standing character: breathing, and nothing else.
 *
 * The owner: "when virgil is waiting I want him to move but only breathing
 * etc, same as the prover." So both characters idle on this — a rise of up
 * to 1.2 cm, a sway of ±0.6° and a yaw of ±1.1°, at three rates that never
 * share a period, so it does not visibly loop. Rigged clips are reserved
 * for events (a turn, a hand-off, a verdict); a rigged Prover drops in the
 * same way later.
 *
 * The rise starts at the standing height and only goes up. V3 and V4
 * centred it on the standing height, which sank the Prover's feet 1.5 cm
 * into the floor on every exhale; and the sway is small because it pivots
 * at the feet, and a foot's edge at 0.29 m from the axis dips 7.5 mm at
 * the old ±1.5°. `test/prover-station.test.ts` checks that these numbers
 * keep the Prover clear of his station at every extreme.
 */
export const BREATH = {
  rise: 0.012,
  sway: 0.0105,
  yaw: 0.02,
  riseHz: 0.143,
  swayHz: 0.0875,
  yawHz: 0.059,
} as const;

export interface Breath {
  /** Vertical lift, 0 .. rise. */
  rise: number;
  /** Roll about z, radians. */
  sway: number;
  /** Turn about y, radians. */
  yaw: number;
}

/**
 * The pose at time `t`, offset by `phase` so two characters never breathe
 * in step; `rate` scales the tempo (a working character breathes faster).
 */
export function breathe(t: number, phase: number, rate = 1): Breath {
  const tt = t * rate;
  return {
    rise: BREATH.rise * 0.5 * (1 + Math.sin(2 * Math.PI * BREATH.riseHz * tt + phase)),
    sway: BREATH.sway * Math.sin(2 * Math.PI * BREATH.swayHz * tt + phase * 1.7),
    yaw: BREATH.yaw * Math.sin(2 * Math.PI * BREATH.yawHz * tt + phase * 0.6),
  };
}

/** The extremes, for a clearance test. */
export const BREATH_EXTREMES: Breath[] = [];
for (const rise of [0, BREATH.rise]) {
  for (const sway of [-BREATH.sway, 0, BREATH.sway]) {
    for (const yaw of [-BREATH.yaw, 0, BREATH.yaw]) BREATH_EXTREMES.push({ rise, sway, yaw });
  }
}
