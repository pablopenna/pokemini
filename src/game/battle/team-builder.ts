import { Dex } from '@pkmn/dex';
import { getRouteData } from '#/game/overworld/location.ts';
import type { Location } from '#/types/overworld/location.ts';
import type { EncounterMethod, EncounterVersion } from '#/types/overworld/route-encounter.ts';
import type { Pokemon, Team } from '#/types/pokemon.ts';

const gen3 = Dex.forGen(3);

const MAX_MOVES = 4;

type PokemonOptions = {
  moves?: string[];
  item?: string | null;
};

// The scraped data spells Nidoran with gender symbols; the sim knows them as Nidoran-F / Nidoran-M.
const toSimSpecies = (species: string) => species.replace('♀', '-F').replace('♂', '-M');

/** Last level-up moves a species knows at a level in gen 3 (what a wild Pokémon would have). */
async function defaultMoves(species: string, level: number): Promise<string[]> {
  const learnset = await gen3.learnsets.get(species);
  const levelUp: { move: string; level: number }[] = [];
  for (const [move, sources] of Object.entries(learnset?.learnset ?? {})) {
    const learnedAt = sources
      .map((s) => s.match(/^3L(\d+)$/)?.[1])
      .filter((l): l is string => !!l)
      .map(Number);
    if (learnedAt.length) levelUp.push({ move, level: Math.min(...learnedAt) });
  }
  return levelUp
    .filter((m) => m.level <= level)
    .sort((a, b) => a.level - b.level)
    .slice(-MAX_MOVES)
    .map((m) => gen3.moves.get(m.move).name);
}

/** A Pokémon received at a fixed level (e.g. a gift), with the moves it would know by level up in gen 3. */
export async function buildLeveledPokemon(species: string, level: number): Promise<Pokemon> {
  return buildPokemon(species, level, { moves: await defaultMoves(toSimSpecies(species), level) });
}

/** Builds a set the sim can use (see `Teams.pack`) with neutral nature, no EVs and perfect IVs. */
export function buildPokemon(species: string, level: number, { moves = [], item = null }: PokemonOptions = {}): Pokemon {
  const data = Dex.species.get(toSimSpecies(species));
  if (!data.exists) throw new Error(`Unknown species "${species}"`);

  return {
    name: data.name,
    species: data.name,
    item: item ?? '',
    ability: gen3.species.get(data.name).abilities[0] ?? '',
    moves,
    nature: 'Hardy',
    gender: '',
    evs: { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 },
    ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
    level,
  };
}

/**
 * Team of a trainer in a location, with the moves and held items from the page.
 * Names are not unique within a location (e.g. rival fights), so `occurrence` picks
 * the nth trainer with that name, in page order.
 */
export function getTrainerTeam(location: Location, trainerName: string, occurrence = 0): Team {
  const trainers = getRouteData(location).trainers.filter((t) => t.name === trainerName);
  const trainer = trainers[occurrence];
  if (!trainer) {
    throw new Error(`No trainer "${trainerName}" (occurrence ${occurrence}) in "${location}"`);
  }

  return trainer.team.map((p) => buildPokemon(p.species, p.level ?? 1, { moves: p.moves, item: p.heldItem }));
}

type WildOptions = {
  /** Where it is found; needed when the species appears with several methods. */
  method?: EncounterMethod;
  /** Defaults to FireRed. */
  version?: Exclude<EncounterVersion, 'unknown'>;
  /** Overrides the level, which is otherwise random within the location's level range. */
  level?: number;
};

/**
 * Single-Pokémon team for a wild encounter of `species` in a location. The page has no moves
 * for wild Pokémon, so it gets the last four it would have learned by level up in gen 3.
 */
export async function getWildTeam(location: Location, species: string, options: WildOptions = {}): Promise<Team> {
  const { method, version = 'firered', level } = options;
  const matches = getRouteData(location).encounters.filter((e) =>
    e.species === species
    && (!method || e.method === method)
    && (e.version === version || e.version === 'unknown'));
  if (!matches.length) {
    throw new Error(`No encounter of "${species}"${method ? ` (${method})` : ''} in "${location}"`);
  }

  // Several rows can match (one per method, or several rows of the same method): use the widest range.
  const min = Math.min(...matches.map((e) => e.minLevel ?? Infinity));
  const max = Math.max(...matches.map((e) => e.maxLevel ?? -Infinity));
  const chosen = level ?? (Number.isFinite(min) ? min + Math.floor(Math.random() * (max - min + 1)) : 1);

  const moves = await defaultMoves(toSimSpecies(species), chosen);
  return [buildPokemon(species, chosen, { moves })];
}
