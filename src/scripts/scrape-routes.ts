import axios from 'axios';
import * as cheerio from 'cheerio';
import * as fsp from 'fs/promises'
import * as path from 'path';

import type { RouteData } from '#/types/route.ts';

import { downloadImage } from '#/scripts/utils/download-image.ts'
import { parseEncounters } from '#/scripts/utils/parse-encounters.ts';
import { parseTrainers } from '#/scripts/utils/parse-trainers.ts';

const ROUTE_URL = 'https://www.serebii.net/pokearth/kanto/3rd/route13.shtml';
const FORCE = process.argv.includes('--force');
const ROUTES_DIR = path.join('src', 'data', 'routes');

async function scrapeRoute(url: string, routeId: string, force: boolean) {
  const jsonPath = path.join(ROUTES_DIR, `${routeId}.json`);

  if (!force) {
    try {
      const cached = await fsp.readFile(jsonPath, 'utf8');
      console.log(`Skipping ${routeId} (cached at ${jsonPath})`);
      return JSON.parse(cached);
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code !== 'ENOENT') throw err;
      // ENOENT = not cached yet, fall through to scrape
    }
  }

  console.log(`Scraping ${routeId} from ${url}...`);
  const { data: html } = await axios.get(url);
  const $ = cheerio.load(html);

  const imageSrc = $('img[src*="/pokearth/maps/"]').first().attr('src') || null;
  const imageUrl = imageSrc ? new URL(imageSrc, url).href : null;
  const image = imageUrl ? await downloadImage(imageUrl, routeId, force) : null;

  const encounters = parseEncounters($);
  const trainers = parseTrainers($);

  const routeData: RouteData = { id: routeId, url, image, encounters, trainers };

  await fsp.mkdir(ROUTES_DIR, { recursive: true });
  await fsp.writeFile(jsonPath, JSON.stringify(routeData, null, 2));

  return routeData;
}

(async () => {
  await scrapeRoute(ROUTE_URL, 'route13', FORCE);
  console.log('Saved route data.');
})();
