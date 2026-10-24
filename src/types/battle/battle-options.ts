import { Team } from '#/types/pokemon';

export type PlayerControl = 'ui' | 'ai';

export type BattleOptions = {
  team1: Team;
  team2: Team;
  player1Control?: PlayerControl;
};
