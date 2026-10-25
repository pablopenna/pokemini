import * as cheerio from 'cheerio';
import type { ItemMethod, RouteItem, RouteMart } from "#/types/overworld/route-item.ts";
import type { Sections } from '#/scripts/scrape-routes/utils/parse-sections.ts';

// Prefix of the "Method" cell -> method. Whatever follows is the note.
const METHOD_PREFIXES: [string, ItemMethod][] = [
  ['On Floor', 'floor'],
  ['Itemfinder', 'hidden'],
  ['Gift', 'gift'],
];

const cellTexts = ($: cheerio.CheerioAPI, row: cheerio.Cheerio<any>): string[] =>
  row.find('> td').map((_, c) => $(c).text().replace(/\s+/g, ' ').trim()).get();

// Items and marts are plain tables without a class, told apart by their header row.
export function parseItems($: cheerio.CheerioAPI, sectionOf: Sections['sectionOf']): { items: RouteItem[]; marts: RouteMart[] } {
  const items: RouteItem[] = [];
  const marts: RouteMart[] = [];

  $('table:not([class])').each((_, table) => {
    if ($(table).parents('table').length) return;
    const rows = $(table).find('> tbody > tr, > tr');
    const header = cellTexts($, rows.eq(0)).join('|');

    if (header === 'Pics|Item|Method') {
      rows.slice(1).each((_, row) => {
        const [, item, methodText] = cellTexts($, $(row));
        if (!item) return;
        const prefix = METHOD_PREFIXES.find(([p]) => methodText.startsWith(p));
        if (!prefix) {
          console.warn(`Unknown item method "${methodText}" for ${item} — skipping`);
          return;
        }
        const note = methodText.slice(prefix[0].length).trim();
        items.push({ item, method: prefix[1], ...(note && { note }), section: sectionOf(table) });
      });
    } else if (cellTexts($, rows.eq(1)).join('|') === 'Item|Price') {
      const stock = rows.slice(2).map((_, row) => {
        const [item, price] = cellTexts($, $(row));
        const n = parseInt(price?.replace(/\D/g, ''), 10);
        return item ? { item, price: Number.isNaN(n) ? null : n } : null;
      }).get();
      marts.push({ name: cellTexts($, rows.eq(0))[0], stock, section: sectionOf(table) });
    }
  });

  return { items, marts };
}
