import * as cheerio from 'cheerio';
import type { RouteEncounter, EncounterMethod } from "#/types/overworld/route-encounter.ts";
import { isEncounterMethod } from "#/types/overworld/route-encounter.ts";


export function parseEncounters($: cheerio.CheerioAPI): RouteEncounter[] {
  const encounters: RouteEncounter[] = [];
  let currentMethod: EncounterMethod | null = null;

  $('table.extradextable, table.dextable').each((_, table) => {
    const rows = $(table).find('tr');
    if (rows.length < 4) return;

    // Method anchor lives only on the FireRed ("extradextable") of each pair.
    // LeafGreen tables inherit the previous method.
    const anchor = $(rows[0]).find('a[name]').first().attr('name');
    if (anchor) {
      const normalized = anchor.toLowerCase();
      if (isEncounterMethod(normalized)) {
        currentMethod = normalized;
      } else {
        console.warn(`Unknown encounter method "${anchor}" — skipping table group`);
        currentMethod = null;
      }
    }
    if (!currentMethod) return;

    // Version marker: row 1 for FireRed tables, row 0 for LeafGreen tables.
    const versionTd = $(rows[0]).find('td.firered, td.leafgreen')
      .add($(rows[1]).find('td.firered, td.leafgreen'))
      .first();
    const vClass = versionTd.attr('class') || '';
    const version: RouteEncounter['version'] =
      vClass.includes('firered') ? 'firered'
        : vClass.includes('leafgreen') ? 'leafgreen'
          : 'unknown';

    const species = $(table).find('td.name').map((_, el) => $(el).text().trim()).get();
    const rates = $(table).find('td.rate').map((_, el) => {
      const n = parseInt($(el).text().replace('%', '').trim(), 10);
      return Number.isNaN(n) ? 0 : n;
    }).get();

    for (let i = 0; i < species.length; i++) {
      if (!species[i]) continue;
      encounters.push({
        method: currentMethod,
        version,
        species: species[i],
        rate: rates[i] ?? 0,
      });
    }
  });

  return encounters;
}
