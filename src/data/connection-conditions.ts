import type { GameFlag } from '#/types/game-flags.ts';
import { Location } from '#/types/overworld/location.ts';

// Optional requirements (all must be met) to travel from one location to another, keyed by
// origin then destination. Kept apart from the scraped route JSON so that
// re-scraping doesn't overwrite it.
export const CONNECTION_CONDITIONS: Partial<Record<Location, Partial<Record<Location, GameFlag[]>>>> = {
  [Location.PalletTown]: {
    [Location.Route21]: ['canSurf'],
  },
};
