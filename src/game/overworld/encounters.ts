import type { GameFlag, GameFlags } from '#/types/game-flags.ts';
import type { EncounterMethod } from '#/types/overworld/route-encounter.ts';

// Flag needed to trigger encounters of a method; the rest need none.
const METHOD_FLAGS: Partial<Record<EncounterMethod, GameFlag>> = {
  surf: 'canSurf',
  oldrod: 'hasOldRod',
  goodrod: 'hasGoodRod',
  superrod: 'hasSuperRod',
  rocksmash: 'canRockSmash',
};

/** Whether the player's flags allow encounters of a method. */
export function isMethodUnlocked(method: EncounterMethod, flags: GameFlags): boolean {
  const flag = METHOD_FLAGS[method];
  return !flag || flags[flag];
}
