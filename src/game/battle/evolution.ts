import { Dex } from '@pkmn/dex';
import { partyMaxHp } from '#/game/pokemon-stats';
import type { PartyPokemon } from '#/types/pokemon';

const gen3 = Dex.forGen(3);

/** Species a Pokémon turns into by reaching its level, if any (items, trades and friendship are not handled, nor is Shedinja, which needs a free party slot). */
export function levelEvolution(pokemon: PartyPokemon): string | null {
  const options = (gen3.species.get(pokemon.species).evos ?? [])
    .map(name => gen3.species.get(name))
    .filter(evo => evo.exists && evo.num <= 386 && evo.name !== 'Shedinja' && !evo.evoType && !evo.evoCondition && evo.evoLevel && pokemon.level >= evo.evoLevel);
  if (!options.length) return null;
  // Like Wurmple, which has two outcomes decided by chance.
  return options[Math.floor(Math.random() * options.length)].name;
}

/** The Pokémon as `species`: same level, moves and experience, with the HP that its new max brings. */
export function evolve(pokemon: PartyPokemon, species: string): PartyPokemon {
  const before = gen3.species.get(pokemon.species);
  const data = gen3.species.get(species);
  const next: PartyPokemon = {
    ...pokemon,
    species: data.name,
    // A nickname stays; the default name follows the species.
    name: !pokemon.name || pokemon.name === before.name ? data.name : pokemon.name,
    ability: data.abilities[0] ?? pokemon.ability,
  };
  // null (full HP) stays full; fainted stays fainted.
  if (pokemon.hp) next.hp = pokemon.hp + partyMaxHp(next) - partyMaxHp(pokemon);
  return next;
}
