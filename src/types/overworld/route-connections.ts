export const DIRECTIONS = ['north', 'south', 'east', 'west'] as const;

export type RouteConnection = Record<(typeof DIRECTIONS)[number], string | null> & { inner: string[] };
