import { it } from 'vitest';
import { run } from './sweep-cluster.js';

/**
 * The sweep, as the one thing Vite will run for me. `VIRGIL_SWEEP` chooses
 * `report` (the default), `portrait` or `landscape`.
 */
it('reports the cluster’s own measurements', () => {
  run(process.env.VIRGIL_SWEEP ?? 'report');
});
