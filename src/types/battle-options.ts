import type { Teams } from '@pkmn/sim';

export type Team = NonNullable<Parameters<typeof Teams.pack>[0]>;

export type PlayerControl = 'ui' | 'ai';

export type BattleOptions = {
  team1: Team;
  team2: Team;
  player1Control?: PlayerControl;
};
