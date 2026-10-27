export type CatchAttempt = {
  caught: boolean;
  /** Times the ball wobbles before it opens or locks: 0-3 (a catch always shows 3). */
  shakes: number;
};

export type CatchParams = {
  /** The species' base catch rate (3-255). */
  catchRate: number;
  hp: number;
  maxHp: number;
  /** Sim id of the foe's major status, empty if none. */
  status: string;
  /** The item's `catch` rate: a multiplier, or 'master' for a sure catch. */
  ball: number | 'master';
};

const statusBonus = (status: string) => (status === 'slp' || status === 'frz' ? 2 : status ? 1.5 : 1);

/** Gen 3 catch formula. `random` returns a float in [0, 1). */
export function attemptCatch(
  { catchRate, hp, maxHp, status, ball }: CatchParams,
  random: () => number = Math.random,
): CatchAttempt {
  if (ball === 'master') return { caught: true, shakes: 3 };

  const a = Math.max(1, Math.floor(((3 * maxHp - 2 * hp) * catchRate * ball * statusBonus(status)) / (3 * maxHp)));
  if (a >= 255) return { caught: true, shakes: 3 };

  const b = Math.floor(1048560 / Math.sqrt(Math.sqrt(16711680 / a)));
  let shakes = 0;
  while (shakes < 4 && Math.floor(random() * 65536) < b) shakes++;
  return shakes === 4 ? { caught: true, shakes: 3 } : { caught: false, shakes };
}
