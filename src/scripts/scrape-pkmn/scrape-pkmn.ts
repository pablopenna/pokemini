import axios from 'axios';
import * as fsp from 'fs/promises';
import * as path from 'path';
import { Dex } from '@pkmn/dex';

import type { GrowthRate, PokemonData, StatKey } from '#/types/pokemon-data.ts';

const FORCE = process.argv.includes('--force');
const ALL = process.argv.includes('--all');
const DELAY_MS = 100;
const GEN3_DEX_SIZE = 386;
const POKEMON_DIR = path.join('src', 'data', 'pokemon');

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
const VERSION = 'firered';

const STAT_NAMES: Record<string, StatKey> = {
  'hp': 'hp',
  'attack': 'atk',
  'defense': 'def',
  'special-attack': 'spa',
  'special-defense': 'spd',
  'speed': 'spe',
};

// "lucky-egg" -> "Lucky Egg"
const titleCase = (slug: string) => slug.split('-').map(w => w[0].toUpperCase() + w.slice(1)).join(' ');

type ApiPokemon = {
  base_experience: number;
  stats: { effort: number; stat: { name: string } }[];
  held_items: { item: { name: string }; version_details: { rarity: number; version: { name: string } }[] }[];
};

async function scrapePokemon(species: { id: string; num: number; name: string }, force: boolean) {
  const jsonPath = path.join(POKEMON_DIR, `${species.id}.json`);

  if (!force) {
    try {
      const cached = await fsp.readFile(jsonPath, 'utf8');
      console.log(`Skipping ${species.id} (cached at ${jsonPath})`);
      return JSON.parse(cached) as PokemonData;
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code !== 'ENOENT') throw err;
      // ENOENT = not cached yet, fall through to scrape
    }
  }

  // Requested by dex number, which also resolves species with several formes (e.g. Deoxys).
  const url = `${API}/pokemon/${species.num}`;
  let pokemon: ApiPokemon;
  let catchRate: number;
  let growthRate: GrowthRate;
  try {
    console.log(`Scraping ${species.id} from ${url}...`);
    pokemon = (await axios.get<ApiPokemon>(url)).data;
    const speciesData = (await axios.get<{ capture_rate: number; growth_rate: { name: GrowthRate } }>(`${API}/pokemon-species/${species.num}`)).data;
    catchRate = speciesData.capture_rate;
    growthRate = speciesData.growth_rate.name;
  } catch (e: unknown) {
    console.error(`Error fetching ${url}. Code: ${(e as any).status}`);
    return;
  }

  const evYield: PokemonData['evYield'] = {};
  for (const { effort, stat } of pokemon.stats) {
    if (effort) evYield[STAT_NAMES[stat.name]] = effort;
  }

  const heldItems = pokemon.held_items.flatMap(({ item, version_details }) => {
    const detail = version_details.find(v => v.version.name === VERSION);
    return detail ? [{ item: titleCase(item.name), rate: detail.rarity }] : [];
  });

  const pokemonData: PokemonData = {
    id: species.id,
    num: species.num,
    name: species.name,
    url,
    catchRate,
    growthRate,
    expYield: pokemon.base_experience,
    evYield,
    heldItems,
  };

  await fsp.mkdir(POKEMON_DIR, { recursive: true });
  await fsp.writeFile(jsonPath, JSON.stringify(pokemonData, null, 2));

  return pokemonData;
}

// Species of the gen 3 dex (no alternate formes), in dex order.
const gen3Species = () => Dex.forGen(3).species.all()
  .filter(s => s.num >= 1 && s.num <= GEN3_DEX_SIZE && !s.forme)
  .sort((a, b) => a.num - b.num);

(async () => {
  parseParameters(args);
  const species = gen3Species();

  if (ALL) {
    for (const s of species) {
      try {
        await scrapePokemon(s, FORCE);
      } catch (e) {
        console.error(`Failed to scrape ${s.id}:`, e);
      }
      await new Promise((resolve) => setTimeout(resolve, DELAY_MS));
    }
    console.log(`Scraped ${species.length} Pokémon`);
    return;
  }

  if (idParam === '') {
    console.error('Pokémon required. specify with --id <name|number>, e.g. --id pidgey, or use --all');
    return;
  }

  const wanted = species.find(s => s.id === idParam.toLowerCase().replace(/[^a-z0-9]/g, '') || String(s.num) === idParam);
  if (!wanted) {
    console.error(`Unknown gen 3 Pokémon "${idParam}"`);
    return;
  }
  const result = await scrapePokemon(wanted, FORCE);
  console.log(result ? 'Success' : 'Failure');
})();
