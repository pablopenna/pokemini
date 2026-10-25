export const ENCOUNTER_METHODS = [
  'grass',
  'surf',
  'oldrod',
  'goodrod',
  'superrod',
  'rocksmash',
  'gift',
  'static',
] as const;

export type EncounterMethod = (typeof ENCOUNTER_METHODS)[number];

export function isEncounterMethod(value: string): value is EncounterMethod {
  return (ENCOUNTER_METHODS as readonly string[]).includes(value);
}

export type EncounterVersion = 'firered' | 'leafgreen' | 'unknown';

/** Kind of a `static` encounter (a fixed Pokémon you interact with, e.g. Snorlax or Moltres). */
export type StaticCategory = 'legendary' | 'other';

export type RouteEncounter = {
  method: EncounterMethod;
  version: EncounterVersion;
  species: string;
  /** Null for encounters that are not rolled (gift, static). */
  rate: number | null;
  /** Equal to maxLevel for fixed levels. */
  minLevel: number | null;
  maxLevel: number | null;
  /** One of the location's `sections`. */
  section: string;
  /** Only set for `static` encounters. */
  category?: StaticCategory;
};
