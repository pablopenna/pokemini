import { Dex } from '@pkmn/dex';
import type { PartyPokemon } from '#/types/pokemon';

const gen3 = Dex.forGen(3);

/** Gen 3 max HP formula. */
export function maxHp(base: number, iv: number, ev: number, level: number): number {
  return Math.floor((2 * base + iv + Math.floor(ev / 4)) * level / 100) + level + 10;
}

/** Max HP of a party Pokémon, derived from its species' base HP. */
export function partyMaxHp(pokemon: PartyPokemon): number {
  const species = gen3.species.get(pokemon.species);
  if (!species.exists) throw new Error(`Unknown species "${pokemon.species}"`);
  return maxHp(species.baseStats.hp, pokemon.ivs.hp, pokemon.evs.hp, pokemon.level);
}

/** Base max PP of a move, before PP Ups. */
export function moveMaxPp(move: string): number {
  const data = gen3.moves.get(move);
  return data.exists ? data.pp : 0;
}

/** Max PP of the move at `moveIndex` of a party Pokémon. */
export function partyMaxPp(pokemon: PartyPokemon, moveIndex: number): number {
  return moveMaxPp(pokemon.moves[moveIndex]);
}
