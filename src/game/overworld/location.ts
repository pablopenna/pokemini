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
