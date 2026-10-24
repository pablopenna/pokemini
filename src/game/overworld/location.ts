import { CONNECTION_CONDITIONS } from '#/data/connection-conditions.ts';
import type { GameFlag, GameFlags } from '#/types/game-flags.ts';
import { Location } from '#/types/overworld/location.ts';
import { asRouteData, type RouteData } from '#/types/overworld/route.ts';

const routes = import.meta.glob('/src/data/routes/*.json', { eager: true, import: 'default' });

/** Returns the scraped route data for a location. */
export function getRouteData(location: Location): RouteData {
  const raw = routes[`/src/data/routes/${location}.json`];
  if (!raw) throw new Error(`No route data for location "${location}"`);
  return asRouteData(raw);
}

/** Returns the enum member for a route id (e.g. 'route1'), or null if it isn't a playable location yet. */
export function toLocation(id: string): Location | null {
  return Object.values(Location).find(v => v === id) ?? null;
}

/** Returns the flags required to travel between two locations (empty if none). */
export function getConnectionRequirements(from: Location, to: Location): GameFlag[] {
  return CONNECTION_CONDITIONS[from]?.[to] ?? [];
}

/** Whether the player's flags satisfy every requirement to travel between two locations. */
export function canTravel(from: Location, to: Location, flags: GameFlags): boolean {
  return getConnectionRequirements(from, to).every(flag => flags[flag]);
}
