import * as cheerio from 'cheerio';
import type { RouteTrainer, RouteTrainerPokemon } from "#/types/overworld/route-trainer.ts";
import type { Sections } from '#/scripts/utils/parse-sections.ts';

export function parseTrainers($: cheerio.CheerioAPI, sectionOf: Sections['sectionOf']): RouteTrainer[] {
  const trainers: RouteTrainer[] = [];

  $('table.trainer').each((_, table) => {
    const rows = $(table).find('tr');
    if (rows.length < 3) return;

    const nameCells = $(rows[1]).find('td');
    if (nameCells.length < 2) return;

    const name = $(nameCells[0]).text().trim();
    if (!name) return;

    const levels = $(rows[2]).find('td.level').toArray().map((el) => {
      const m = $(el).text().match(/Level\s+(\d+)/);
      return m ? parseInt(m[1], 10) : null;
    });

    // Moves and held items have one cell per Pokémon, in team order.
    const moves = $(rows[6]).find('td.bor');
    const heldItems = $(rows[7]).find('td.bor');

    const team: RouteTrainerPokemon[] = [];
    for (let i = 1; i < nameCells.length; i++) {
      const species = $(nameCells[i]).text().trim();
      if (!species) continue;

      const heldItem = $(heldItems[i - 1]).text().replace(/^\s*Hold Item\s*:/, '').trim();
      team.push({
        species,
        level: levels[i - 1] ?? null,
        moves: $(moves[i - 1]).find('a').map((_, a) => $(a).text().trim()).get(),
        heldItem: !heldItem || heldItem === 'No Item' ? null : heldItem,
      });
    }

    trainers.push({ name, team, section: sectionOf(table) });
  });

  return trainers;
}
