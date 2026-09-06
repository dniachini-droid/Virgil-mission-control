import { useEffect, useMemo } from 'react';
import { Bot, type BotRole } from './rig.js';

export interface BotPlacement {
  role: BotRole;
  position: [number, number, number];
  yaw?: number;
}

/**
 * Create the character instances once per scene. The scene renders each `bot.root` with a
 * <primitive> and drives `bot.update` from its own frame loop, so choreography and rendering
 * share one clock and one progress value.
 */
export function useBots(placements: BotPlacement[]): Record<BotRole, Bot> {
  const bots = useMemo(() => {
    const out = {} as Record<BotRole, Bot>;
    for (const p of placements) out[p.role] = new Bot(p.role, p.position, p.yaw ?? 0);
    return out;
    // Placements are static per scene; re-creating bots on every render would reset their state.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(
    () => () => {
      for (const b of Object.values(bots)) b.screen.dispose();
    },
    [bots],
  );
  return bots;
}
