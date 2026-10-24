import { getConnectionRequirements, toLocation } from '#/game/overworld/location.ts';
import type { GameFlag } from '#/types/game-flags.ts';
import type { Location } from '#/types/overworld/location.ts';

export type Connection = {
  label: string;
  /** Null when the id isn't a known location. */
  target: Location | null;
  /** Flags the player needs to take this connection (empty if none). */
  requires: GameFlag[];
};

export function toConnection(from: Location, prefix: string, id: string): Connection {
  const target = toLocation(id);
  const requires = target ? getConnectionRequirements(from, target) : [];
  return { label: `${prefix}: ${id}`, target, requires };
}
