
import type { Party } from '#/types/pokemon';

export type BattleResult = 'p1' | 'p2' | 'tie';

/** A move a Pokémon could learn but has no room for: the player decides whether it replaces another. */
export type PendingMove = {
  /** Index into the party. */
  index: number;
  move: { name: string; pp: number };
};

/** What a battle leaves behind: who won and the state of the player's party after it. */
export type BattleOutcome = {
  result: BattleResult;
  party: Party;
  /** Moves to resolve before leaving the battle, in the order they were offered. */
  pendingMoves: PendingMove[];
};
