import type { Pokemon as SimPokemon } from '@pkmn/sim';
import { attemptCatch } from '#/game/battle/catch/catch';
import { playBallThrow, type CatchStage } from '#/game/battle/catch/catch-animation';
import { expForLevel } from '#/game/battle/experience';
import { toPartyPokemon } from '#/game/battle/party-state';
import { getItemData } from '#/game/item/item-data';
import { getPokemonData } from '#/game/pokemon-data';
import type { ItemId } from '#/types/item-id';
import type { PartyPokemon } from '#/types/pokemon';
import { getAsset } from '#/utils/get-asset';

export type ThrowBall = {
  foe: SimPokemon;
  ball: ItemId;
  /** The ball's `catch` rate. */
  rate: number | 'master';
  stage: CatchStage;
  log: (message: string) => void;
  /** The foe escaped; the ball took the player's turn. */
  onBrokeFree: () => void;
  onCaught: (caught: PartyPokemon) => void;
};

/** Throws a ball at the foe: it flies, wobbles, and either catches the foe or lets it out. */
export async function throwBall({ foe, ball, rate, stage, log, onBrokeFree, onCaught }: ThrowBall) {
  const data = getPokemonData(foe.species.id);
  const { caught, shakes } = attemptCatch({
    catchRate: data.catchRate,
    hp: foe.hp,
    maxHp: foe.maxhp,
    status: foe.status,
    ball: rate,
  });
  const item = getItemData(ball);
  log(`You threw a ${item?.name ?? 'ball'}!`);
  if (item?.sprite) await playBallThrow(getAsset(item.sprite), shakes, caught, stage);

  if (!caught) {
    log(`${foe.name} broke free!`);
    onBrokeFree();
    return;
  }
  log(`Gotcha! ${foe.name} was caught!`);
  onCaught({
    ...toPartyPokemon(foe.set, expForLevel(data.growthRate, foe.level)),
    hp: foe.hp,
    status: foe.status,
    pp: foe.baseMoveSlots.map(slot => slot.pp),
  });
}
