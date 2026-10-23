import { RouteConnection } from "./route-connections";
import { RouteEncounter } from "./route-encounter";
import { RouteTrainer } from "./route-trainer";

export type RouteData = {
  id: string;
  url: string;
  image: string | null;
  encounters: RouteEncounter[];
  trainers: RouteTrainer[];
  connections: RouteConnection;
};

export function asRouteData(raw: unknown): RouteData {
  return raw as RouteData;
}