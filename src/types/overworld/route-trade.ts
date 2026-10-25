export type RouteTrade = {
  /** Species the player receives. */
  received: string;
  /** In-game name of the received Pokémon, as written on the page. */
  nickname: string;
  /** Null when the page does not give one ("Level ??"). */
  level: number | null;
  /** Species the NPC asks for, or null if the page does not say. */
  requested: string | null;
  /** One of the location's `sections`. */
  section: string;
};
