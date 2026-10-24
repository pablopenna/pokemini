import type { Location } from '#/types/overworld/location';
import type { Team } from '#/types/pokemon';

export type Player = {
  team: Team;
  location: Location;
};
