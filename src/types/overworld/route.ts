import { RouteConnection } from "./route-connections";
import { RouteEncounter } from "./route-encounter";
import { RouteTrainer } from "./route-trainer";

export type RouteData = {
  id: string;
  url: string;
  /** First available map image. */
  image: string | null;
  /** Every map image found on the page (e.g. one per floor). */
  images: string[];
  encounters: RouteEncounter[];
  trainers: RouteTrainer[];
  connections: RouteConnection;
};

export function asRouteData(raw: unknown): RouteData {
  return raw as RouteData;
}