import type { Pokemon as SimPokemon, Side } from '@pkmn/sim';
import type { ChooseForgetMove } from '#/game/battle/experience';
import type { Inventory } from './inventory';
import type { Party } from './pokemon';

/** Where an item is being used from. */
export type ItemScene = 'overworld' | 'battle';

export const ItemScene = {
  Overworld: 'overworld',
  Battle: 'battle',
} as const satisfies Record<string, ItemScene>;

/**
 * What the item is used on. `moveIndex` is only meaningful for items that
 * restore PP for a single move (Ether, Max Ether, ...), and `quantity` for
 * items that can be used several at once (Rare Candy).
 */
export type ItemTarget =
  | { kind: 'party'; index: number; moveIndex?: number; quantity?: number }
  | { kind: 'none' };

export type ItemUseFailureReason =
  | 'unknown-item'
  | 'not-owned'
  | 'not-usable-here'
  | 'invalid-target'
  | 'no-effect';

export type ItemUseFailure = {
  ok: false;
  reason: ItemUseFailureReason;
  message?: string;
};

export type ItemUseSuccess<T> = {
  ok: true;
  messages: string[];
} & T;

export type ItemUseResult<T> = ItemUseSuccess<T> | ItemUseFailure;

/** Effects that change the world outside the party, left for the overworld to apply. */
export type OverworldEvent =
  | { kind: 'escape-rope' }
  | { kind: 'repel'; steps: number }
  | { kind: 'encounter-rate'; multiplier: number };

export type OverworldContext = {
  party: Party;
  inventory: Inventory;
  /** Asks which move to forget when a level-up brings one that doesn't fit; without it such moves are skipped. */
  chooseForget?: ChooseForgetMove;
};

export type OverworldItemUseResult = ItemUseResult<{
  party: Party;
  inventory: Inventory;
  events: OverworldEvent[];
}>;

/**
 * What the battle loop has to do after the item was used. The handler has
 * already applied the effect to the sim; this describes how to spend the turn.
 */
export type BattleItemAction =
  | { kind: 'pass' }
  | { kind: 'flee' }
  | { kind: 'catch'; rate: number | 'master' };

export type BattleContext = {
  /** The player's sim side. */
  side: Side;
  inventory: Inventory;
  /** Resolves a player party index to the sim Pokémon that represents it. */
  simPokemon: (partyIndex: number) => SimPokemon | null;
  /** Balls and fleeing only make sense in a wild battle. */
  wild: boolean;
};

export type BattleItemUseResult = ItemUseResult<{
  inventory: Inventory;
  action: BattleItemAction;
}>;

/** A bound item usage: what `getItemUsage` returns. */
export type OverworldItemUsage = (
  target: ItemTarget,
  ctx: OverworldContext,
) => Promise<OverworldItemUseResult>;

export type BattleItemUsage = (
  target: ItemTarget,
  ctx: BattleContext,
) => BattleItemUseResult;
