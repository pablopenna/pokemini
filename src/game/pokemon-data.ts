import type { PokemonData } from '#/types/pokemon-data.ts';

const pokemon = import.meta.glob('/src/data/pokemon/*.json', { eager: true, import: 'default' });

/** Sim id of a species name (e.g. "Mr. Mime" -> "mrmime"), which is also its data file name. */
const toId = (species: string) => species.toLowerCase().replace(/[^a-z0-9]/g, '');

/** Returns the scraped data for a species (see `npm run scrapeallpkmn`). */
export function getPokemonData(species: string): PokemonData {
  const raw = pokemon[`/src/data/pokemon/${toId(species)}.json`];
  if (!raw) throw new Error(`No data for species "${species}"`);
  return raw as PokemonData;
}
