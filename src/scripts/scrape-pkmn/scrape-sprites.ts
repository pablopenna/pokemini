import axios from 'axios';
import * as path from 'path';
import { Dex } from '@pkmn/dex';

import { downloadImage } from '#/scripts/scrape-pkmn/utils/download-image.ts';

const FORCE = process.argv.includes('--force');
const ALL = process.argv.includes('--all');
const DELAY_MS = 100;
const GEN3_DEX_SIZE = 386;

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

const FRONT_DIR = path.join('public', 'pokemon', 'default', 'front');
const BACK_DIR = path.join('public', 'pokemon', 'default', 'back');
const ICON_DIR = path.join('public', 'pokemon', 'default', 'icon');

type ApiPokemon = {
  sprites: {
    front_default: string | null;
    back_default: string | null;
    versions?: {
      'generation-iii'?: {
        icons?: { front_default: string | null };
      };
    };
  };
};

async function scrapePokemonSprites(species: { id: string; num: number }, force: boolean) {
  const url = `${API}/pokemon/${species.num}`;
  let pokemon: ApiPokemon;
  try {
    console.log(`Scraping sprites for ${species.id} from ${url}...`);
    pokemon = (await axios.get<ApiPokemon>(url)).data;
  } catch (e: unknown) {
    console.error(`Error fetching ${url}. Code: ${(e as any).status}`);
    return;
  }

  let downloaded = 0;
  if (pokemon.sprites.front_default) {
    await downloadImage(pokemon.sprites.front_default, species.id, force, FRONT_DIR);
    downloaded++;
  }
  if (pokemon.sprites.back_default) {
    await downloadImage(pokemon.sprites.back_default, species.id, force, BACK_DIR);
    downloaded++;
  }
  const icon = pokemon.sprites.versions?.['generation-iii']?.icons?.front_default;
  if (icon) {
    await downloadImage(icon, species.id, force, ICON_DIR);
    downloaded++;
  }
  return downloaded;
}

// Species of the gen 3 dex (no alternate formes), in dex order.
const gen3Species = () => Dex.forGen(3).species.all()
  .filter(s => s.num >= 1 && s.num <= GEN3_DEX_SIZE && !s.forme)
  .sort((a, b) => a.num - b.num);

(async () => {
  parseParameters(args);
  const species = gen3Species();

  if (ALL) {
    let scraped = 0;
    for (const s of species) {
      try {
        if (await scrapePokemonSprites(s, FORCE)) scraped++;
      } catch (e) {
        console.error(`Failed to scrape ${s.id}:`, e);
      }
      await new Promise((resolve) => setTimeout(resolve, DELAY_MS));
    }
    console.log(`Scraped ${scraped} of ${species.length} Pokémon sprite sets`);
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
  const result = await scrapePokemonSprites(wanted, FORCE);
  console.log(result ? 'Success' : 'Failure');
})();