import * as cheerio from 'cheerio';
import type { RouteTrainer } from "#/types/overworld/route-trainer.ts";

export function parseTrainers($: cheerio.CheerioAPI): RouteTrainer[] {
  const trainers: RouteTrainer[] = [];

  $('table.trainer').each((_, table) => {
    const rows = $(table).find('tr');
    if (rows.length < 3) return;

    const nameCells = $(rows[1]).find('td');
    if (nameCells.length < 2) return;

    const name = $(nameCells[0]).text().trim();
    if (!name) return;

    const team: string[] = [];
    for (let i = 1; i < nameCells.length; i++) {
      const species = $(nameCells[i]).text().trim();
      if (species) team.push(species);
    }

    const levels = $(rows[2]).find('td.level').map((_, el) => {
      const m = $(el).text().match(/Level\s+(\d+)/);
      return m ? parseInt(m[1], 10) : null;
    }).get();

    trainers.push({ name, team, levels });
  });

  return trainers;
}