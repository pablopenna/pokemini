import type { Battle as SimBattle, Pokemon as SimPokemon } from '@pkmn/sim';
import { maxHp } from '#/game/pokemon-stats';
import type { GrowthRate } from '#/types/pokemon-data';
import type { PartyPokemon } from '#/types/pokemon';

export const MAX_LEVEL = 100;
const MAX_MOVES = 4;

/** Total experience a Pokémon needs to be at level `n` (gen 3 curves). */
export function expForLevel(rate: GrowthRate, n: number): number {
  const cube = n ** 3;
  switch (rate) {
    case 'fast': return Math.floor(4 * cube / 5);
    case 'medium': return cube;
    case 'medium-slow': return Math.max(0, Math.floor(6 * cube / 5 - 15 * n ** 2 + 100 * n - 140));
    case 'slow': return Math.floor(5 * cube / 4);
    case 'slow-then-very-fast': // erratic
      if (n <= 50) return Math.floor(cube * (100 - n) / 50);
      if (n <= 68) return Math.floor(cube * (150 - n) / 100);
      if (n <= 98) return Math.floor(cube * Math.floor((1911 - 10 * n) / 3) / 500);
      return Math.floor(cube * (160 - n) / 100);
    case 'fast-then-very-slow': // fluctuating
      if (n <= 15) return Math.floor(cube * (Math.floor((n + 1) / 3) + 24) / 50);
      if (n <= 35) return Math.floor(cube * (n + 14) / 50);
      return Math.floor(cube * (Math.floor(n / 2) + 32) / 50);
  }
}

/** Experience each participant gets for defeating a wild Pokémon, split among the participants. */
export const expReward = (baseExp: number, level: number, participants: number) =>
  Math.max(1, Math.floor(baseExp * level / (7 * participants)));

/**
 * Follows a battle and works out the experience of the player's (side 1) Pokémon.
 * Everyone that has been in front of a foe when it faints and is still standing shares its experience.
 * Returns the experience earned so far by each of the player's Pokémon, which fills up as the battle goes.
 */
export function trackExperience(
  sim: SimBattle,
  baseExpOf: (foe: SimPokemon) => number,
  levelOf: (foe: SimPokemon) => number = foe => foe.level,
): Map<SimPokemon, number> {
  const [player, foe] = sim.sides;
  const facing = new Map<SimPokemon, Set<SimPokemon>>();
  const earned = new Map<SimPokemon, number>();

  // The sim has no hook for either, so wrap the methods that switch Pokémon in and settle faints.
  const switchIn = sim.actions.switchIn.bind(sim.actions);
  sim.actions.switchIn = (...args) => {
    const result = switchIn(...args);
    const mine = player.active[0];
    const theirs = foe.active[0];
    if (mine && theirs && mine.hp && theirs.hp) {
      if (!facing.has(theirs)) facing.set(theirs, new Set());
      facing.get(theirs)!.add(mine);
    }
    return result;
  };

  const faintMessages = sim.faintMessages.bind(sim);
  sim.faintMessages = (...args) => {
    const fainted = new Set(foe.pokemon.filter(p => p.fainted));
    const result = faintMessages(...args);
    for (const defeated of foe.pokemon) {
      if (!defeated.fainted || fainted.has(defeated)) continue;
      const winners = [...facing.get(defeated) ?? []].filter(p => p.hp > 0);
      const reward = winners.length && expReward(baseExpOf(defeated), levelOf(defeated), winners.length);
      for (const p of winners) earned.set(p, (earned.get(p) ?? 0) + reward);
    }
    return result;
  };

  return earned;
}

export type LevelUpData = {
  growthRate: GrowthRate;
  baseHp: number;
  /** Moves a species learns at a level, with their PP. */
  movesAt: (level: number) => Promise<{ name: string; pp: number }[]>;
};

export type ExpGain = {
  pokemon: PartyPokemon;
  /** Moves it could learn but has no room for. */
  pendingMoves: { name: string; pp: number }[];
  /** What to tell the player. */
  messages: string[];
};

/**
 * Adds experience to a Pokémon and levels it up as far as it reaches: HP grows with the max HP,
 * and moves learned at the new levels are added while there is room. The rest are returned as
 * `pendingMoves`, since forgetting a move is the player's call (see `learnMove`).
 */
export async function gainExperience(pokemon: PartyPokemon, gained: number, data: LevelUpData): Promise<ExpGain> {
  const name = pokemon.name || pokemon.species;
  const messages = [`${name} gained ${gained} Exp. Points!`];
  const pendingMoves: ExpGain['pendingMoves'] = [];
  const next: PartyPokemon = {
    ...pokemon,
    exp: Math.min(pokemon.exp + gained, expForLevel(data.growthRate, MAX_LEVEL)),
  };

  while (next.level < MAX_LEVEL && next.exp >= expForLevel(data.growthRate, next.level + 1)) {
    const grown = maxHp(data.baseHp, next.ivs.hp, next.evs.hp, next.level + 1)
      - maxHp(data.baseHp, next.ivs.hp, next.evs.hp, next.level);
    next.level++;
    // null (full HP) stays full; fainted stays fainted.
    if (next.hp) next.hp += grown;
    messages.push(`${name} grew to Lv. ${next.level}!`);

    for (const move of await data.movesAt(next.level)) {
      if (next.moves.includes(move.name)) continue;
      if (next.moves.length >= MAX_MOVES) {
        pendingMoves.push(move);
        continue;
      }
      next.moves = [...next.moves, move.name];
      if (next.pp) next.pp = [...next.pp, move.pp];
      messages.push(`${name} learned ${move.name}!`);
    }
  }

  return { pokemon: next, pendingMoves, messages };
}

/** Teaches a move to a Pokémon, replacing the move at `forget`. */
export function learnMove(pokemon: PartyPokemon, move: { name: string; pp: number }, forget: number): PartyPokemon {
  return {
    ...pokemon,
    moves: pokemon.moves.map((m, i) => (i === forget ? move.name : m)),
    pp: pokemon.pp && pokemon.pp.map((pp, i) => (i === forget ? move.pp : pp)),
  };
}
