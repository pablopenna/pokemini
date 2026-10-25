export const STAT_KEYS = ['hp', 'atk', 'def', 'spa', 'spd', 'spe'] as const;

export type StatKey = (typeof STAT_KEYS)[number];

/** Experience curve of a species, named as in PokéAPI. */
export type GrowthRate =
  | 'slow'
  | 'medium'
  | 'fast'
  | 'medium-slow'
  | 'slow-then-very-fast'
  | 'fast-then-very-slow';

export type HeldItem = {
  item: string;
  /** Chance (%) that a wild one holds the item. */
  rate: number;
};

export type PokemonData = {
  /** Sim id of the species (e.g. 'mrmime'); also the file name. */
  id: string;
  /** National dex number. */
  num: number;
  name: string;
  /** PokéAPI endpoint the data was fetched from. */
  url: string;
  catchRate: number;
  growthRate: GrowthRate;
  /** Base experience yield. */
  expYield: number;
  /** Effort values given when defeated. */
  evYield: Partial<Record<StatKey, number>>;
  /** Items a wild one can hold in FireRed. */
  heldItems: HeldItem[];
};
