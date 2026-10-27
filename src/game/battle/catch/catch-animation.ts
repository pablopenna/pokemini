import { sleep } from '#/game/battle/battle-animations';

export type BallPhase = 'throw' | 'shake' | 'caught' | 'gone';

/** The ball as drawn over the battle: `n` changes on every shake so the wobble restarts. */
export type BallState = { sprite: string; phase: BallPhase; n: number };

export type CatchStage = {
  setBall: (ball: BallState | null) => void;
  /** Hides the foe while it is inside the ball. */
  setFoeHidden: (hidden: boolean) => void;
};

const THROW_MS = 700; // keep in sync with the throw animation in SpriteRenderer.svelte
const SHAKE_MS = 800; // keep in sync with the shake animation in SpriteRenderer.svelte

/** Throws the ball at the foe, wobbles it `shakes` times, then locks it (`caught`) or lets the foe out. */
export async function playBallThrow(sprite: string, shakes: number, caught: boolean, stage: CatchStage) {
  stage.setBall({ sprite, phase: 'throw', n: 0 });
  await sleep(THROW_MS);
  stage.setFoeHidden(true);
  await sleep(400);

  for (let n = 1; n <= shakes; n++) {
    stage.setBall({ sprite, phase: 'shake', n });
    await sleep(SHAKE_MS);
  }

  if (caught) {
    stage.setBall({ sprite, phase: 'caught', n: shakes + 1 });
    await sleep(600);
    return;
  }
  stage.setBall({ sprite, phase: 'gone', n: shakes + 1 });
  stage.setFoeHidden(false);
  await sleep(300);
  stage.setBall(null);
}
