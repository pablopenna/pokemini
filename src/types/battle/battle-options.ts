import type { Inventory } from '#/types/inventory';
import { Party, PartyPokemon, Team } from '#/types/pokemon';

export enum PlayerControl {
  UI = 'ui',
  AI_RANDOM = 'ai',
  AI_AGGRO = 'ai_aggro',
}

export type BattleOptions = {
  team1: Party;
  team2: Team;
  player1Control?: PlayerControl;
  wild?: boolean;
  /** The player's bag, for items used during the battle. */
  inventory?: Inventory;
  /** Asks the player which move to forget so `pokemon` can learn `move`; null keeps the current ones. */
  chooseForgetMove?: (pokemon: PartyPokemon, move: { name: string; pp: number }) => Promise<number | null>;
};
