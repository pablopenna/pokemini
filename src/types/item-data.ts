export type ItemData = {
  /** PokéAPI slug of the item (e.g. 'poke-ball'); also the file name. */
  id: string;
  /** PokéAPI id of the item. */
  num: number;
  name: string;
  /** PokéAPI endpoint the data was fetched from. */
  url: string;
  /** Damage dealt when the item is thrown, or null if it can't be held. */
  flingPower: number | null;
  /** Effect of the thrown item (e.g. 'flinch'), or null if it has none. */
  flingEffect: string | null;
  /** PokéAPI attribute slugs, e.g. 'countable', 'holdable'. */
  attributes: string[];
  category: string;
  /** English short effect, empty when PokéAPI has no entry for the item. */
  description: string;
  /** Local path to the item sprite (e.g. '/items/poke-ball.png'). */
  sprite: string;
};
