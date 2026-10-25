import axios from 'axios';
import * as cheerio from 'cheerio';
import * as fsp from 'fs/promises'
import * as path from 'path';

import type { RouteData } from '#/types/overworld/route.ts';

import { downloadImage } from '#/scripts/scrape-routes/utils/download-image.ts'
import { parseEncounters } from '#/scripts/scrape-routes/utils/parse-encounters.ts';
import { parseItems } from '#/scripts/scrape-routes/utils/parse-items.ts';
import { parseSections } from '#/scripts/scrape-routes/utils/parse-sections.ts';
import { parseTrades } from '#/scripts/scrape-routes/utils/parse-trades.ts';
import { parseTrainers } from '#/scripts/scrape-routes/utils/parse-trainers.ts';
import { parseConnections } from './utils/parse-connections.ts';

const FORCE = process.argv.includes('--force');
const CRAWL = process.argv.includes('--crawl');
const CRAWL_DELAY_MS = 300;
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

// Downloads every map image on the page (some places have one per floor).
// Images that fail to download (e.g. 404) are skipped. The first one that
// succeeds is saved as <routeId>, the rest as <routeId>-<original name>.
async function downloadImages($: cheerio.CheerioAPI, url: string, routeId: string, force: boolean): Promise<string[]> {
  const srcs = [...new Set($('img[src*="/pokearth/maps/"]').map((_, el) => $(el).attr('src')).get())];
  const saved: string[] = [];

  for (const src of srcs) {
    const imageUrl = new URL(src, url).href;
    const name = saved.length === 0 ? routeId : `${routeId}-${path.parse(src).name}`;
    try {
      saved.push(await downloadImage(imageUrl, name, force));
    } catch (e) {
      console.warn(`  Skipping image ${imageUrl} (${(e as any).status ?? e})`);
    }
  }
  return saved;
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
    // Serebii serves windows-1252, which axios would otherwise decode as UTF-8 ("PokéMart" -> "Pok?Mart").
    const { data } = await axios.get<ArrayBuffer>(url, { responseType: 'arraybuffer' });
    html = new TextDecoder('windows-1252').decode(data);
  } catch(e: unknown) {
    console.error(`Error fetching ${url}. Code: ${(e as any).status}`);
    return;
  }
  
  const $ = cheerio.load(html);

  const images = await downloadImages($, url, routeId, force);
  const image = images[0] ?? null;

  const { sections, sectionOf } = parseSections($);
  const encounters = parseEncounters($, sectionOf);
  const trainers = parseTrainers($, sectionOf);
  const { items, marts } = parseItems($, sectionOf);
  const trades = parseTrades($, sectionOf);
  const connections = parseConnections($);

  const routeData: RouteData = { id: routeId, url, image, images, sections, encounters, trainers, items, marts, trades, connections };

  await fsp.mkdir(ROUTES_DIR, { recursive: true });
  await fsp.writeFile(jsonPath, JSON.stringify(routeData, null, 2));

  return routeData;
}

// Returns every location linked from a route (exits and inner areas).
const connectionIds = (route: RouteData): string[] => {
  const { inner, ...exits } = route.connections;
  return [...Object.values(exits), ...inner].filter((id): id is string => !!id && !id.includes('/'));
}

// Depth-first: scrape a route, then recurse into each of its connections.
async function crawl(routeId: string, visited: Set<string>) {
  if (visited.has(routeId)) return;
  visited.add(routeId);

  let route: RouteData | undefined;
  try {
    route = await scrapeRoute(getUrl(routeId), routeId, FORCE);
  } catch (e) {
    console.error(`Failed to scrape ${routeId}:`, e);
  }
  if (!route) return;

  await new Promise((resolve) => setTimeout(resolve, CRAWL_DELAY_MS));
  for (const id of connectionIds(route)) {
    await crawl(id, visited);
  }
}

(async () => {
  parseParameters(args);
  if(routeIdParam === '') {
    console.error("Route ID required. specify with --id <routeId>. e.g --id route13");
    return;
  }

  if (CRAWL) {
    const visited = new Set<string>();
    await crawl(routeIdParam, visited);
    console.log(`Crawled ${visited.size} locations`);
    return;
  }

  const url = getUrl(routeIdParam);
  const result = await scrapeRoute(url, routeIdParam, FORCE);
  console.log(result ? 'Success' : 'Failure');
})();
