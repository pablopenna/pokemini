import type { Pokemon as SimPokemon } from '@pkmn/sim';
import { getItemData } from '#/game/item/item-data';
import { getItemEffects } from '#/game/item/item-effects';
import type {
  BattleEffect,
  Boost,
  Catch,
  CureStatus,
  CureVolatile,
  Flee,
  HealHp,
  MajorStatus,
  RestorePp,
  Revive,
  ReviveAll,
} from '#/game/item/item-effects';
import { consumeItem, fail, hasItem, isConsumable } from '#/game/item/item-use';
import type { ItemData } from '#/types/item-data';
import type { ItemId } from '#/types/item-id';
import type {
  BattleContext,
  BattleItemAction,
  BattleItemUseResult,
  ItemTarget,
  ItemUseFailure,
  ItemUseResult,
} from '#/types/item-usage';

type BattleHandlerResult = ItemUseResult<{ action: BattleItemAction }>;

function simTarget(target: ItemTarget, ctx: BattleContext): SimPokemon | null {
  if (target.kind !== 'party') return null;
  return ctx.simPokemon(target.index);
}

const pass = (messages: string[] = []): BattleHandlerResult => ({
  ok: true,
  messages,
  action: { kind: 'pass' },
});

/**
 * Revives a fainted sim Pokémon and emits the one `-heal` line that
 * `@pkmn/client` understands as a revival. Bag items have no protocol of their
 * own, and the client only clears `fainted` when the source is
 * `revivalblessing`; borrowing that source also gives the right log line
 * ("was revived and is ready to fight again").
 */
function reviveSim(ctx: BattleContext, sim: SimPokemon, fraction: number): void {
  const hp = fraction >= 1 ? sim.maxhp : Math.max(1, Math.floor(sim.maxhp * fraction));

  sim.fainted = false;
  sim.faintQueued = false;
  sim.subFainted = false;
  sim.status = '';
  sim.switchFlag = false;
  // `sethp` refuses to work while the Pokémon still has 0 HP.
  sim.hp = 1;
  sim.sethp(hp);
  ctx.side.battle.clearEffectState(sim.statusState);
  sim.side.pokemonLeft++;
  ctx.side.battle.add('-heal', sim, sim.getHealth, '[from] move: Revival Blessing');
}

// ---- effect handlers --------------------------------------------------
function healHp(
  effect: HealHp,
  target: ItemTarget,
  ctx: BattleContext,
  _item: ItemData,
): BattleHandlerResult {
  const sim = simTarget(target, ctx);
  if (!sim) return fail('invalid-target', 'Choose a Pokémon to heal.');
  if (sim.fainted || sim.hp <= 0) {
    return fail('no-effect', `${sim.name} has fainted. Use a Revive instead.`);
  }
  if (sim.hp >= sim.maxhp) return fail('no-effect', `${sim.name} is already at full health.`);

  const amount = effect.amount === 'full' ? sim.maxhp : effect.amount;
  const healed = sim.heal(amount);
  if (!healed) return fail('no-effect', `It had no effect on ${sim.name}.`);

  // `Pokemon.heal` does not emit a message. Do not pass `[from] item: ...`
  // here: @pkmn/client treats that as a held item and would set `poke.item`.
  ctx.side.battle.add('-heal', sim, sim.getHealth);
  return pass();
}

function cureStatus(
  effect: CureStatus,
  target: ItemTarget,
  ctx: BattleContext,
): BattleHandlerResult {
  const sim = simTarget(target, ctx);
  if (!sim) return fail('invalid-target', 'Choose a Pokémon to cure.');

  const status = sim.status as MajorStatus | 'fnt' | '';
  if (!status || status === 'fnt') {
    return fail('no-effect', `${sim.name} has no status condition.`);
  }
  if (effect.statuses !== 'all' && !effect.statuses.includes(status)) {
    return fail('no-effect', `${sim.name} is not affected by that status.`);
  }

  // Emits `-curestatus`, which the battle log picks up.
  sim.cureStatus();
  return pass();
}

function restorePp(
  effect: RestorePp,
  target: ItemTarget,
  ctx: BattleContext,
): BattleHandlerResult {
  const sim = simTarget(target, ctx);
  if (!sim) return fail('invalid-target', 'Choose a Pokémon whose PP to restore.');

  const moveIndex = target.kind === 'party' ? target.moveIndex : undefined;
  let slots: SimPokemon['moveSlots'];

  if (effect.moves === 'one') {
    if (moveIndex === undefined || !sim.moveSlots[moveIndex]) {
      return fail('invalid-target', 'Choose a move to restore PP for.');
    }
    slots = [sim.moveSlots[moveIndex]];
  } else {
    slots = sim.moveSlots;
  }

  const messages: string[] = [];
  for (const slot of slots) {
    if (slot.pp >= slot.maxpp) continue;
    const amount = effect.amount === 'full' ? slot.maxpp : effect.amount;
    const restored = Math.min(slot.maxpp, slot.pp + amount) - slot.pp;
    slot.pp += restored;
    messages.push(`${sim.name}'s ${slot.move} PP was restored by ${restored}!`);
  }

  if (!messages.length) {
    return fail(
      'no-effect',
      effect.moves === 'one'
        ? `${sim.name}'s ${slots[0]?.move} already has full PP.`
        : `${sim.name}'s PP is already full.`,
    );
  }

  return pass(messages);
}

function revive(
  effect: Revive,
  target: ItemTarget,
  ctx: BattleContext,
  _item: ItemData,
): BattleHandlerResult {
  const sim = simTarget(target, ctx);
  if (!sim) return fail('invalid-target', 'Choose a fainted Pokémon to revive.');
  if (!sim.fainted && sim.hp > 0) return fail('no-effect', `${sim.name} has not fainted.`);
  if (sim.isActive) return fail('invalid-target', 'Choose a benched Pokémon to revive.');

  reviveSim(ctx, sim, effect.fraction);
  return pass();
}

function reviveAll(
  effect: ReviveAll,
  _target: ItemTarget,
  ctx: BattleContext,
  _item: ItemData,
): BattleHandlerResult {
  const fainted = ctx.side.pokemon.filter(sim => sim.fainted || sim.hp <= 0);
  if (!fainted.length) return fail('no-effect', 'No Pokémon have fainted.');

  for (const sim of fainted) reviveSim(ctx, sim, effect.fraction);
  return pass();
}

function cureVolatile(
  effect: CureVolatile,
  target: ItemTarget,
  ctx: BattleContext,
): BattleHandlerResult {
  const sim = simTarget(target, ctx);
  if (!sim) return fail('invalid-target', 'Choose a Pokémon to cure.');

  let cured = false;
  for (const volatile of effect.volatiles) {
    if (sim.removeVolatile(volatile)) cured = true;
  }

  if (!cured) return fail('no-effect', `${sim.name} is not affected.`);
  return pass();
}

function boost(
  effect: Boost,
  target: ItemTarget,
  ctx: BattleContext,
  _item: ItemData,
): BattleHandlerResult {
  const sim = simTarget(target, ctx);
  if (!sim) return fail('invalid-target', 'Choose a Pokémon to boost.');
  if (sim.fainted) return fail('no-effect', `${sim.name} has fainted.`);
  if (!sim.isActive) {
    return fail('invalid-target', 'X items can only be used on the active Pokémon.');
  }

  // Passing the item as the effect would emit `[from] item: ...`, which the
  // client would interpret as a held item. The plain boost line is enough.
  const applied = ctx.side.battle.boost(effect.boosts, sim, sim, null);
  if (!applied) return fail('no-effect', `${sim.name}'s stats won't go any higher.`);

  return pass();
}

function catchPokemon(
  effect: Catch,
  _target: ItemTarget,
  ctx: BattleContext,
  item: ItemData,
): BattleHandlerResult {
  if (!ctx.wild) {
    return fail('not-usable-here', `${item.name} can only be used in a wild battle.`);
  }
  return { ok: true, messages: [], action: { kind: 'catch', rate: effect.rate } };
}

function flee(
  _effect: Flee,
  _target: ItemTarget,
  ctx: BattleContext,
  item: ItemData,
): BattleHandlerResult {
  if (!ctx.wild) {
    return fail('not-usable-here', `${item.name} can only be used in a wild battle.`);
  }
  return { ok: true, messages: ['Got away safely!'], action: { kind: 'flee' } };
}

function composite(
  effect: Extract<BattleEffect, { kind: 'composite' }>,
  target: ItemTarget,
  ctx: BattleContext,
  item: ItemData,
): BattleHandlerResult {
  const messages: string[] = [];
  let action: BattleItemAction = { kind: 'pass' };
  let lastFailure: ItemUseFailure | null = null;
  let successes = 0;

  for (const sub of effect.effects) {
    const result = dispatchBattle(sub, target, ctx, item);
    if (!result.ok) {
      // A composite (e.g. Full Restore) still works when only one part applies.
      lastFailure = result;
      continue;
    }
    messages.push(...result.messages);
    if (result.action.kind !== 'pass') action = result.action;
    successes++;
  }

  if (!successes) return lastFailure ?? fail('no-effect', 'It had no effect.');
  return { ok: true, messages, action };
}

// ---- registry ---------------------------------------------------------
type BattleHandler<K extends BattleEffect['kind']> = (
  effect: Extract<BattleEffect, { kind: K }>,
  target: ItemTarget,
  ctx: BattleContext,
  item: ItemData,
) => BattleHandlerResult;

const battleHandlers: { [K in BattleEffect['kind']]: BattleHandler<K> } = {
  'heal-hp': healHp,
  'cure-status': cureStatus,
  'restore-pp': restorePp,
  'revive': revive,
  'revive-all': reviveAll,
  'cure-volatile': cureVolatile,
  'boost': boost,
  'catch': catchPokemon,
  'flee': flee,
  'composite': composite,
};

function dispatchBattle(
  effect: BattleEffect,
  target: ItemTarget,
  ctx: BattleContext,
  item: ItemData,
): BattleHandlerResult {
  // The map is exhaustive; the cast only widens the effect to the union.
  const handler = battleHandlers[effect.kind] as unknown as (
    effect: BattleEffect,
    target: ItemTarget,
    ctx: BattleContext,
    item: ItemData,
  ) => BattleHandlerResult;
  return handler(effect, target, ctx, item);
}

// ---- public API -------------------------------------------------------
export function useBattleItem(
  id: ItemId,
  target: ItemTarget,
  ctx: BattleContext,
): BattleItemUseResult {
  const data = getItemData(id);
  if (!data) return fail('unknown-item', 'That item does not exist.');
  if (!hasItem(ctx.inventory, id)) return fail('not-owned', `You don't have any ${data.name}.`);

  const effects = getItemEffects(id);
  const effect = effects?.battle;
  if (!effects || !effect) return fail('not-usable-here', `${data.name} can't be used here.`);

  const result = dispatchBattle(effect, target, ctx, data);
  if (!result.ok) return result;

  return {
    ok: true,
    messages: result.messages,
    action: result.action,
    inventory: consumeItem(ctx.inventory, id, isConsumable(data, effects)),
  };
}
