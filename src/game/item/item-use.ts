import type { ItemData } from '#/types/item-data';
import type { ItemEffects } from '#/game/item/item-effects';
import type { Inventory } from '#/types/inventory';
import type { ItemId } from '#/types/item-id';
import type { ItemUseFailure, ItemUseFailureReason } from '#/types/item-usage';

export function fail(reason: ItemUseFailureReason, message?: string): ItemUseFailure {
  return { ok: false, reason, message };
}

export function hasItem(inventory: Inventory, id: ItemId): boolean {
  return inventory.some(item => item.id === id && item.amount > 0);
}

/** How many of `id` the inventory holds. */
export const amountOf = (inventory: Inventory, id: ItemId): number =>
  inventory.find(item => item.id === id)?.amount ?? 0;

/**
 * Removes `count` of `id` from the inventory. Key items and other non-consumable
 * items are left alone. This is only called after a successful use.
 */
export function consumeItem(inventory: Inventory, id: ItemId, consumable: boolean, count = 1): Inventory {
  if (!consumable) return inventory;

  const entry = inventory.find(item => item.id === id);
  if (!entry) return inventory;
  if (entry.amount <= count) return inventory.filter(item => item.id !== id);

  return inventory.map(item => (item.id === id ? { ...item, amount: item.amount - count } : item));
}

/**
 * Whether using an item removes one from the bag. The scraped attributes are
 * incomplete (Escape Rope and Repel have none), so an item with no attributes
 * at all is treated as consumable. Key items can opt out in the effect table.
 */
export function isConsumable(data: ItemData, effects: ItemEffects): boolean {
  if (effects.consumable !== undefined) return effects.consumable;
  return data.attributes.includes('consumable') || data.attributes.length === 0;
}
