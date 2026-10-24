import axios from 'axios';
import * as cheerio from 'cheerio';
import * as fsp from 'fs/promises'
import * as path from 'path';

import type { RouteData } from '#/types/overworld/route.ts';

import { downloadImage } from '#/scripts/utils/download-image.ts'
import { parseEncounters } from '#/scripts/utils/parse-encounters.ts';
import { parseTrainers } from '#/scripts/utils/parse-trainers.ts';
import { parseConnections } from './utils/parse-connections.ts';

const FORCE = process.argv.includes('--force');
const ROUTES_DIR = path.join('src', 'data', 'routes');

let routeIdParam = '';
const args = process.argv.slice(2);

const parseParameters = (args: string[]) => {
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--id' || args[i] === '-id') {
      routeIdParam = args[++i];
    }
  }
}

const getUrl = (routeId: string = 'route1'): string => {
  return `https://www.serebii.net/pokearth/kanto/3rd/${routeId}.shtml`
}

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

  let html = null;
  try {
    console.log(`Scraping ${routeId} from ${url}...`);
    const { data: r_html } = await axios.get(url);
    html = r_html;
  } catch(e: unknown) {
    console.error(`Error fetching ${url}. Code: ${(e as any).status}`);
    return;
  }
  
  const $ = cheerio.load(html);

  const imageSrc = $('img[src*="/pokearth/maps/"]').first().attr('src') || null;
  const imageUrl = imageSrc ? new URL(imageSrc, url).href : null;
  const image = imageUrl ? await downloadImage(imageUrl, routeId, force) : null;

  const encounters = parseEncounters($);
  const trainers = parseTrainers($);
  const connections = parseConnections($);

  const routeData: RouteData = { id: routeId, url, image, encounters, trainers, connections };

  await fsp.mkdir(ROUTES_DIR, { recursive: true });
  await fsp.writeFile(jsonPath, JSON.stringify(routeData, null, 2));

  return routeData;
}

(async () => {
  parseParameters(args);
  if(routeIdParam === '') {
    console.error("Route ID required. specify with --id <routeId>. e.g --id route13");
    return;
  }

  const url = getUrl(routeIdParam);
  const result = await scrapeRoute(url, routeIdParam, FORCE);
  console.log(result ? 'Success' : 'Failure');
})();
