import type { GameFlags } from '#/types/game-flags';
import type { Location } from '#/types/overworld/location';
import type { Team } from '#/types/pokemon';

export type Player = {
  team: Team;
  location: Location;
  gameFlags: GameFlags;
  /** Locations where the player already picked their gift. */
  claimedGifts: Location[];
};

export const MAX_TEAM_SIZE = 6;
