
import type { Party } from '#/types/pokemon';

export type BattleResult = 'p1' | 'p2' | 'tie';

/** What a battle leaves behind: who won and the state of the player's party after it. */
export type BattleOutcome = {
  result: BattleResult;
  party: Party;
};
