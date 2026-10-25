export type ItemMethod = 'floor' | 'hidden' | 'gift';

export type RouteItem = {
  item: string;
  /** `hidden` items need the Itemfinder. */
  method: ItemMethod;
  /** Condition or giver as written on the page, e.g. "Defeat Giovanni". */
  note?: string;
  /** One of the location's `sections`. */
  section: string;
};

export type RouteMart = {
  /** Shop title as written on the page, e.g. "PokéMart" or "Dept. Store - 2F - Counter One". */
  name: string;
  stock: { item: string; price: number | null }[];
  /** One of the location's `sections`. */
  section: string;
};
