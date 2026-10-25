import * as cheerio from 'cheerio';
import { Dex } from '@pkmn/dex';
import type { RouteTrade } from "#/types/overworld/route-trade.ts";
import type { Sections } from '#/scripts/scrape-routes/utils/parse-sections.ts';

// The page only shows a sprite for the received species, named after its dex number.
// Names are spelled as Serebii does so they match the rest of the data.
const speciesFromDexNumber = (num: number): string | null => {
  const name = Dex.species.all().find((s) => s.num === num && !s.forme)?.name;
  if (!name) return null;
  return name.replace('’', "'").replace('Nidoran-F', 'Nidoran♀').replace('Nidoran-M', 'Nidoran♂');
};

export function parseTrades($: cheerio.CheerioAPI, sectionOf: Sections['sectionOf']): RouteTrade[] {
  const trades: RouteTrade[] = [];

  $('table.dextable').each((_, table) => {
    if ($(table).find('td.gift').first().text().trim() !== 'Trade') return;

    const dexNumber = $(table).find('img').map((_, img) => $(img).attr('src')?.match(/\/pokearth\/sprites\/\w+\/(\d+)\.png/)?.[1]).get()[0];
    const received = dexNumber ? speciesFromDexNumber(parseInt(dexNumber, 10)) : null;
    const nickname = $(table).find('td.label').first().text().trim();
    if (!received) {
      console.warn(`Could not determine the species received in trade "${nickname}" — skipping`);
      return;
    }

    const levelMatch = $(table).find('td.label').map((_, el) => $(el).text().match(/Level\s+(\d+)/)?.[1]).get()[0];
    const requested = $(table).text().match(/Trader requests an?\s+(.+)/)?.[1].trim() ?? null;

    trades.push({
      received,
      nickname,
      level: levelMatch ? parseInt(levelMatch, 10) : null,
      requested,
      section: sectionOf(table),
    });
  });

  return trades;
}
