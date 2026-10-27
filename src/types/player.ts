import type { GameFlags } from '#/types/game-flags';
import type { Location } from '#/types/overworld/location';
import type { Party } from '#/types/pokemon';
import { Inventory } from './inventory';

export type Player = {
  team: Party;
  location: Location;
  /** Area of the location (e.g. Main Area, Gym). */
  section: string;
  gameFlags: GameFlags;
  /** Locations where the player already picked their gift. */
  claimedGifts: Location[];
  inventory: Inventory;
};

export const MAX_TEAM_SIZE = 6;
