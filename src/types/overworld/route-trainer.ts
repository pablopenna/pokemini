export type RouteTrainerPokemon = {
  species: string;
  level: number | null;
  moves: string[];
  heldItem: string | null;
};

export type RouteTrainer = {
  name: string;
  team: RouteTrainerPokemon[];
  /** One of the location's `sections`. */
  section: string;
};
