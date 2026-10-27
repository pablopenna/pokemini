import { Party, Team } from '#/types/pokemon';

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
};
