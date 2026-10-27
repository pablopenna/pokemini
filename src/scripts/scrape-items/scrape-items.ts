import axios from 'axios';
import * as fsp from 'fs/promises';
import * as path from 'path';

import type { ItemData } from '#/types/item-data.ts';
import { downloadImage } from '#/scripts/scrape-items/utils/download-image.ts';

const FORCE = process.argv.includes('--force');
const ALL = process.argv.includes('--all');
const DELAY_MS = 100;
const ITEMS_DIR = path.join('src', 'data', 'items');

let idParam = '';
const args = process.argv.slice(2);

const parseParameters = (args: string[]) => {
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--id' || args[i] === '-id') {
      idParam = args[++i];
    }
  }
}

const API = 'https://pokeapi.co/api/v2';

// "poke-ball" -> "Poke Ball"
const titleCase = (slug: string) => slug.split('-').map(w => w[0].toUpperCase() + w.slice(1)).join(' ');

// Item name as typed on a page -> PokéAPI slug ("King's Rock" -> "kings-rock").
const toItemId = (name: string) => name
  .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  .toLowerCase()
  .replace(/['’.]/g, '')
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-|-$/g, '');

type ApiItem = {
  id: number;
  name: string;
  fling_power: number | null;
  fling_effect: { name: string } | null;
  attributes: { name: string }[];
  category: { name: string };
  effect_entries: { short_effect: string; language: { name: string } }[];
  names: { name: string; language: { name: string } }[];
  sprites: { default: string };
};

async function scrapeItem(id: string, force: boolean): Promise<ItemData | undefined> {
  const jsonPath = path.join(ITEMS_DIR, `${id}.json`);

  if (!force) {
    try {
      const cached = await fsp.readFile(jsonPath, 'utf8');
      console.log(`Skipping ${id} (cached at ${jsonPath})`);
      return JSON.parse(cached) as ItemData;
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code !== 'ENOENT') throw err;
      // ENOENT = not cached yet, fall through to scrape
    }
  }

  const url = `${API}/item/${id}`;
  let item: ApiItem;
  try {
    console.log(`Scraping ${id} from ${url}...`);
    item = (await axios.get<ApiItem>(url)).data;
  } catch (e: unknown) {
    console.error(`Error fetching ${url}. Code: ${(e as any).status}`);
    return;
  }

  // Cache the sprite locally so the game doesn't hotlink PokéAPI.
  const sprite = item.sprites.default
    ? await downloadImage(item.sprites.default, id, force)
    : '';

  const itemData: ItemData = {
    id,
    num: item.id,
    name: item.names.find(n => n.language.name === 'en')?.name ?? titleCase(item.name),
    url,
    flingPower: item.fling_power,
    flingEffect: item.fling_effect?.name ?? null,
    attributes: item.attributes.map(a => a.name),
    category: item.category.name,
    description: item.effect_entries.find(e => e.language.name === 'en')?.short_effect ?? '',
    sprite,
  };

  await fsp.mkdir(ITEMS_DIR, { recursive: true });
  await fsp.writeFile(jsonPath, JSON.stringify(itemData, null, 2));

  return itemData;
}

// Every item in PokéAPI, in id order.
async function allItems(): Promise<string[]> {
  const { data } = await axios.get<{ results: { name: string; url: string }[] }>(`${API}/item?limit=100000`);
  return data.results
    .sort((a, b) => Number(a.url.split('/').at(-2)) - Number(b.url.split('/').at(-2)))
    .map(r => r.name);
}

(async () => {
  parseParameters(args);

  if (ALL) {
    const items = await allItems();
    let scraped = 0;
    for (const id of items) {
      try {
        if (await scrapeItem(id, FORCE)) scraped++;
      } catch (e) {
        console.error(`Failed to scrape ${id}:`, e);
      }
      await new Promise((resolve) => setTimeout(resolve, DELAY_MS));
    }
    console.log(`Scraped ${scraped} of ${items.length} items`);
    return;
  }

  if (idParam === '') {
    console.error('Item required. specify with --id <name>, e.g. --id "Poke Ball", or use --all');
    return;
  }

  const result = await scrapeItem(toItemId(idParam), FORCE);
  console.log(result ? 'Success' : 'Failure');
})();
