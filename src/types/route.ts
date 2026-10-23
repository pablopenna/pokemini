export const ENCOUNTER_METHODS = [
  'grass',
  'surf',
  'oldrod',
  'goodrod',
  'superrod',
  'gift',
  'trade',
] as const;

export type EncounterMethod = (typeof ENCOUNTER_METHODS)[number];

export function isEncounterMethod(value: string): value is EncounterMethod {
  return (ENCOUNTER_METHODS as readonly string[]).includes(value);
}

export type EncounterVersion = 'firered' | 'leafgreen' | 'unknown';

export type RouteEncounter = {
  method: EncounterMethod;
  version: EncounterVersion;
  species: string;
  rate: number;
};

export type RouteTrainer = {
  name: string;
  team: string[];
  levels: (number | null)[];
};

export type RouteData = {
  id: string;
  url: string;
  image: string | null;
  encounters: RouteEncounter[];
  trainers: RouteTrainer[];
};

export function asRouteData(raw: unknown): RouteData {
  return raw as RouteData;
}