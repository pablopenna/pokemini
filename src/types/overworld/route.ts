import { RouteConnection } from "./route-connections";
import { RouteEncounter } from "./route-encounter";
import { RouteItem, RouteMart } from "./route-item";
import { RouteTrade } from "./route-trade";
import { RouteTrainer } from "./route-trainer";

export type RouteData = {
  id: string;
  url: string;
  /** First available map image. */
  image: string | null;
  /** Every map image found on the page (e.g. one per floor). */
  images: string[];
  /** Area titles of the location (e.g. Main Area, Gym). Encounters and trainers reference these. */
  sections: string[];
  encounters: RouteEncounter[];
  trainers: RouteTrainer[];
  items: RouteItem[];
  marts: RouteMart[];
  trades: RouteTrade[];
  connections: RouteConnection;
};

export function asRouteData(raw: unknown): RouteData {
  return raw as RouteData;
}