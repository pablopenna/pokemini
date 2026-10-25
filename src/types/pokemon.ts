import type { PokemonSet } from '@pkmn/data';

export type Pokemon = PokemonSet;
export type Team = Pokemon[];

/**
 * A Pokémon of the player: the sim set (level, moves, IVs, EVs) plus what persists between battles.
 * `hp` and `pp` are null until the Pokémon has fought, which means full.
 */
export type PartyPokemon = Pokemon & {
  /** Total experience points. */
  exp: number;
  /** HP left; 0 means fainted. */
  hp: number | null;
  /** Sim id of the major status ('par', 'slp', ...), empty if none. */
  status: string;
  /** PP left per move, in the order of `moves`. */
  pp: number[] | null;
};

export type Party = PartyPokemon[];
