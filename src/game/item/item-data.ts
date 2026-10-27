import type { ItemData } from '#/types/item-data.ts';
import type { ItemId } from '#/types/item-id.ts';

const items = import.meta.glob('/src/data/items/*.json', { eager: true, import: 'default' });

/** Returns the scraped data for an item id (see `npm run scrapeallitems`), or null if it doesn't exist. */
export function getItemData(id: ItemId): ItemData | null {
  return (items[`/src/data/items/${id}.json`] as ItemData | undefined) ?? null;
}
