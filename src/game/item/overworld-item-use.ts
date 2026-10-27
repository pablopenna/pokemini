import { getItemData } from '#/game/item/item-data';
import { getItemEffects } from '#/game/item/item-effects';
import type {
  CureStatus,
  EncounterRate,
  Escape,
  HealHp,
  LevelUp,
  MajorStatus,
  OverworldEffect,
  Repel,
  RestorePp,
  Revive,
  ReviveAll,
} from '#/game/item/item-effects';
import { amountOf, consumeItem, fail, hasItem, isConsumable } from '#/game/item/item-use';
import { expForLevel, gainExperience, learnPendingMoves, MAX_LEVEL } from '#/game/battle/experience';
import { levelUpDataFor } from '#/game/battle/level-up-data';
import { partyMaxHp, partyMaxPp } from '#/game/pokemon-stats';
import { ItemId } from '#/types/item-id';
import type {
  ItemTarget,
  ItemUseFailure,
  ItemUseResult,
  OverworldContext,
  OverworldEvent,
  OverworldItemUseResult,
} from '#/types/item-usage';
import type { Party, PartyPokemon } from '#/types/pokemon';

type OverworldHandlerResult = ItemUseResult<{
  party: Party;
  events?: OverworldEvent[];
  /** How many of the item the effect spent; one unless it says otherwise. */
  used?: number;
}>;

type PartyTarget = {
  index: number;
  pokemon: PartyPokemon;
  moveIndex?: number;
};

const STATUS_NAMES: Record<MajorStatus, string> = {
  brn: 'burn',
  frz: 'freeze',
  par: 'paralysis',
  psn: 'poison',
  slp: 'sleep',
  tox: 'poison',
};

const nameOf = (pokemon: PartyPokemon) => pokemon.name || pokemon.species;

function success(
  party: Party,
  messages: string[],
  events?: OverworldEvent[],
): OverworldHandlerResult {
  return events ? { ok: true, party, messages, events } : { ok: true, party, messages };
}

function partyTarget(target: ItemTarget, party: Party): PartyTarget | null {
  if (target.kind !== 'party') return null;
  const pokemon = party[target.index];
  return pokemon ? { index: target.index, pokemon, moveIndex: target.moveIndex } : null;
}

const replace = (party: Party, index: number, pokemon: PartyPokemon): Party =>
  party.map((current, i) => (i === index ? pokemon : current));

// ---- effect handlers --------------------------------------------------
function healHp(
  effect: HealHp,
  target: ItemTarget,
  ctx: OverworldContext,
): OverworldHandlerResult {
  const t = partyTarget(target, ctx.party);
  if (!t) return fail('invalid-target', 'Choose a Pokémon to heal.');

  const { pokemon, index } = t;
  const name = nameOf(pokemon);
  const max = partyMaxHp(pokemon);
  const current = pokemon.hp ?? max;

  if (current === 0) return fail('no-effect', `${name} has fainted. Use a Revive instead.`);
  if (current >= max) return fail('no-effect', `${name} is already at full health.`);

  const amount = effect.amount === 'full' ? max : effect.amount;
  const healed = Math.min(max, current + amount) - current;
  const hp = current + healed >= max ? null : current + healed;

  return success(replace(ctx.party, index, { ...pokemon, hp }), [
    `${name} recovered ${healed} HP!`,
  ]);
}

function cureStatus(
  effect: CureStatus,
  target: ItemTarget,
  ctx: OverworldContext,
): OverworldHandlerResult {
  const t = partyTarget(target, ctx.party);
  if (!t) return fail('invalid-target', 'Choose a Pokémon to cure.');

  const { pokemon, index } = t;
  const name = nameOf(pokemon);
  const status = pokemon.status as MajorStatus;
  const statusName = STATUS_NAMES[status];

  if (!statusName) return fail('no-effect', `${name} has no status condition.`);
  if (effect.statuses !== 'all' && !effect.statuses.includes(status)) {
    return fail('no-effect', `${name} is not affected by ${statusName}.`);
  }

  return success(replace(ctx.party, index, { ...pokemon, status: '' }), [
    `${name} was cured of its ${statusName}.`,
  ]);
}

function restorePp(
  effect: RestorePp,
  target: ItemTarget,
  ctx: OverworldContext,
): OverworldHandlerResult {
  const t = partyTarget(target, ctx.party);
  if (!t) return fail('invalid-target', 'Choose a Pokémon whose PP to restore.');

  const { pokemon, index, moveIndex } = t;
  const name = nameOf(pokemon);

  let indexes: number[];
  if (effect.moves === 'one') {
    if (moveIndex === undefined || !pokemon.moves[moveIndex]) {
      return fail('invalid-target', 'Choose a move to restore PP for.');
    }
    indexes = [moveIndex];
  } else {
    indexes = pokemon.moves.map((_, i) => i);
  }

  const maxPp = pokemon.moves.map((_, i) => partyMaxPp(pokemon, i));
  const nextPp = [...(pokemon.pp ?? maxPp)];
  const messages: string[] = [];

  for (const i of indexes) {
    const max = maxPp[i] ?? 0;
    const current = nextPp[i] ?? max;
    if (current >= max) continue;

    const amount = effect.amount === 'full' ? max : effect.amount;
    const restored = Math.min(max, current + amount) - current;
    nextPp[i] = current + restored;
    messages.push(`${name}'s ${pokemon.moves[i]} PP was restored by ${restored}!`);
  }

  if (!messages.length) {
    return fail(
      'no-effect',
      effect.moves === 'one'
        ? `${name}'s ${pokemon.moves[indexes[0]]} already has full PP.`
        : `${name}'s PP is already full.`,
    );
  }

  const full = nextPp.every((pp, i) => pp >= (maxPp[i] ?? 0));
  return success(replace(ctx.party, index, { ...pokemon, pp: full ? null : nextPp }), messages);
}

function revive(
  effect: Revive,
  target: ItemTarget,
  ctx: OverworldContext,
): OverworldHandlerResult {
  const t = partyTarget(target, ctx.party);
  if (!t) return fail('invalid-target', 'Choose a fainted Pokémon to revive.');

  const { pokemon, index } = t;
  const name = nameOf(pokemon);
  if ((pokemon.hp ?? 1) !== 0) return fail('no-effect', `${name} has not fainted.`);

  const max = partyMaxHp(pokemon);
  const hp = effect.fraction >= 1 ? null : Math.max(1, Math.floor(max * effect.fraction));

  return success(replace(ctx.party, index, { ...pokemon, hp }), [
    hp === null ? `${name} was revived to full health!` : `${name} was revived!`,
  ]);
}

function reviveAll(
  effect: ReviveAll,
  _target: ItemTarget,
  ctx: OverworldContext,
): OverworldHandlerResult {
  if (!ctx.party.some(pokemon => pokemon.hp === 0)) {
    return fail('no-effect', 'No Pokémon have fainted.');
  }

  const party = ctx.party.map(pokemon => {
    if (pokemon.hp !== 0) return pokemon;
    const max = partyMaxHp(pokemon);
    const hp = effect.fraction >= 1 ? null : Math.max(1, Math.floor(max * effect.fraction));
    return { ...pokemon, hp };
  });

  return success(party, ['All fainted Pokémon were revived!']);
}

async function levelUp(
  _effect: LevelUp,
  target: ItemTarget,
  ctx: OverworldContext,
): Promise<OverworldHandlerResult> {
  const t = partyTarget(target, ctx.party);
  if (!t) return fail('invalid-target', 'Choose a Pokémon to level up.');

  const { pokemon, index } = t;
  const name = nameOf(pokemon);
  if (pokemon.level >= MAX_LEVEL) return fail('no-effect', `${name} is already at the maximum level.`);

  const owned = amountOf(ctx.inventory, ItemId.RareCandy);
  const wanted = target.kind === 'party' ? target.quantity ?? 1 : 1;
  const used = Math.min(wanted, owned, MAX_LEVEL - pokemon.level);
  if (used < 1) return fail('invalid-target', `You don't have any Rare Candy.`);

  // A candy sets the experience to exactly the next level's.
  const data = levelUpDataFor(pokemon.species);
  const gained = expForLevel(data.growthRate, pokemon.level + used) - pokemon.exp;
  const gain = await gainExperience(pokemon, gained, data);
  // The experience message doesn't fit a candy.
  const messages = gain.messages.slice(1);
  const learned = ctx.chooseForget
    ? await learnPendingMoves(gain.pokemon, gain.pendingMoves, ctx.chooseForget, m => messages.push(m))
    : gain.pokemon;

  return { ok: true, party: replace(ctx.party, index, learned), messages, used };
}

function escape(
  _effect: Escape,
  _target: ItemTarget,
  ctx: OverworldContext,
): OverworldHandlerResult {
  return success(ctx.party, ['You escaped!'], [{ kind: 'escape-rope' }]);
}

function repel(effect: Repel, _target: ItemTarget, ctx: OverworldContext): OverworldHandlerResult {
  return success(
    ctx.party,
    [`Wild Pokémon will be kept away for ${effect.steps} steps.`],
    [{ kind: 'repel', steps: effect.steps }],
  );
}

function encounterRate(
  effect: EncounterRate,
  _target: ItemTarget,
  ctx: OverworldContext,
): OverworldHandlerResult {
  return success(ctx.party, [], [{ kind: 'encounter-rate', multiplier: effect.multiplier }]);
}

async function composite(
  effect: Extract<OverworldEffect, { kind: 'composite' }>,
  target: ItemTarget,
  ctx: OverworldContext,
): Promise<OverworldHandlerResult> {
  let party = ctx.party;
  const messages: string[] = [];
  const events: OverworldEvent[] = [];
  let lastFailure: ItemUseFailure | null = null;
  let successes = 0;

  for (const sub of effect.effects) {
    const result = await dispatchOverworld(sub, target, { ...ctx, party });
    if (!result.ok) {
      // A composite (e.g. Full Restore) still works when only one part applies.
      lastFailure = result;
      continue;
    }
    party = result.party;
    messages.push(...result.messages);
    if (result.events) events.push(...result.events);
    successes++;
  }

  if (!successes) return lastFailure ?? fail('no-effect', 'It had no effect.');
  return { ok: true, party, messages, events };
}

// ---- registry ---------------------------------------------------------
type OverworldHandler<K extends OverworldEffect['kind']> = (
  effect: Extract<OverworldEffect, { kind: K }>,
  target: ItemTarget,
  ctx: OverworldContext,
) => OverworldHandlerResult | Promise<OverworldHandlerResult>;

const overworldHandlers: { [K in OverworldEffect['kind']]: OverworldHandler<K> } = {
  'heal-hp': healHp,
  'cure-status': cureStatus,
  'restore-pp': restorePp,
  'revive': revive,
  'revive-all': reviveAll,
  'level-up': levelUp,
  'escape': escape,
  'repel': repel,
  'encounter-rate': encounterRate,
  'composite': composite,
};

async function dispatchOverworld(
  effect: OverworldEffect,
  target: ItemTarget,
  ctx: OverworldContext,
): Promise<OverworldHandlerResult> {
  // The map is exhaustive; the cast only widens the effect to the union.
  const handler = overworldHandlers[effect.kind] as unknown as (
    effect: OverworldEffect,
    target: ItemTarget,
    ctx: OverworldContext,
  ) => OverworldHandlerResult | Promise<OverworldHandlerResult>;
  return handler(effect, target, ctx);
}

// ---- public API -------------------------------------------------------
export async function useOverworldItem(
  id: ItemId,
  target: ItemTarget,
  ctx: OverworldContext,
): Promise<OverworldItemUseResult> {
  const data = getItemData(id);
  if (!data) return fail('unknown-item', 'That item does not exist.');
  if (!hasItem(ctx.inventory, id)) return fail('not-owned', `You don't have any ${data.name}.`);

  const effects = getItemEffects(id);
  const effect = effects?.overworld;
  if (!effects || !effect) return fail('not-usable-here', `${data.name} can't be used here.`);

  const result = await dispatchOverworld(effect, target, ctx);
  if (!result.ok) return result;

  return {
    ok: true,
    party: result.party,
    messages: result.messages,
    inventory: consumeItem(ctx.inventory, id, isConsumable(data, effects), result.used ?? 1),
    events: result.events ?? [],
  };
}
