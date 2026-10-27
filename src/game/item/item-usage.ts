import { useBattleItem } from '#/game/item/battle-item-use';
import { getItemEffects } from '#/game/item/item-effects';
import { useOverworldItem } from '#/game/item/overworld-item-use';
import type { ItemId } from '#/types/item-id';
import type {
  BattleItemUsage,
  ItemScene,
  OverworldItemUsage,
} from '#/types/item-usage';

/**
 * Returns a bound usage function for an item in a scene, or `null` when the
 * item has no behaviour there. The table is the source of truth.
 */
export function getItemUsage(scene: 'overworld', id: ItemId): OverworldItemUsage | null;
export function getItemUsage(scene: 'battle', id: ItemId): BattleItemUsage | null;
export function getItemUsage(
  scene: ItemScene,
  id: ItemId,
): OverworldItemUsage | BattleItemUsage | null;
export function getItemUsage(
  scene: ItemScene,
  id: ItemId,
): OverworldItemUsage | BattleItemUsage | null {
  const effects = getItemEffects(id);
  if (!effects) return null;

  if (scene === 'overworld') {
    if (!effects.overworld) return null;
    const usage: OverworldItemUsage = (target, ctx) => useOverworldItem(id, target, ctx);
    return usage;
  }

  if (!effects.battle) return null;
  const usage: BattleItemUsage = (target, ctx) => useBattleItem(id, target, ctx);
  return usage;
}
