import * as cheerio from 'cheerio';
import type { RouteEncounter, EncounterMethod, StaticCategory } from "#/types/overworld/route-encounter.ts";
import { isEncounterMethod } from "#/types/overworld/route-encounter.ts";
import type { Sections } from '#/scripts/utils/parse-sections.ts';

// Anchors that do not match the method name.
const ANCHOR_ALIASES: Record<string, EncounterMethod> = {
  interact: 'static',
};

// Anchors of tables that are not encounters (parsed elsewhere).
const IGNORED_ANCHORS = ['trade'];

const LEGENDARIES = new Set([
  'Articuno', 'Zapdos', 'Moltres', 'Mewtwo', 'Mew',
  'Raikou', 'Entei', 'Suicune', 'Lugia', 'Ho-Oh', 'Celebi',
  'Deoxys',
]);

// "2 - 5" -> 2..5, "30" -> 30..30
const parseLevels = (text: string): { min: number | null; max: number | null } => {
  const m = text.match(/(\d+)(?:\s*-\s*(\d+))?/);
  if (!m) return { min: null, max: null };
  const min = parseInt(m[1], 10);
  return { min, max: m[2] ? parseInt(m[2], 10) : min };
};

export function parseEncounters($: cheerio.CheerioAPI, sectionOf: Sections['sectionOf']): RouteEncounter[] {
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
      const method = ANCHOR_ALIASES[normalized] ?? normalized;
      if (isEncounterMethod(method)) {
        currentMethod = method;
      } else {
        if (!IGNORED_ANCHORS.includes(normalized)) {
          console.warn(`Unknown encounter method "${anchor}" — skipping table group`);
        }
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
    // Gift and static tables have no rate ("-%" or empty).
    // (toArray: cheerio's map would drop the nulls and shift the indices)
    const rates = $(table).find('td.rate').toArray().map((el) => {
      const n = parseInt($(el).text().replace('%', '').trim(), 10);
      return Number.isNaN(n) ? null : n;
    });
    const levels = $(table).find('td.level').toArray().map((el) => parseLevels($(el).text()));

    for (let i = 0; i < species.length; i++) {
      if (!species[i]) continue;
      const { min: minLevel, max: maxLevel } = levels[i] ?? { min: null, max: null };
      const category: StaticCategory | undefined = currentMethod === 'static'
        ? (LEGENDARIES.has(species[i]) ? 'legendary' : 'other')
        : undefined;
      encounters.push({
        method: currentMethod,
        version,
        species: species[i],
        rate: rates[i] ?? null,
        minLevel,
        maxLevel,
        section: sectionOf(table),
        ...(category && { category }),
      });
    }
  });

  return encounters;
}
