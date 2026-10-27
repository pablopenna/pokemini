import { Dex } from '@pkmn/dex';
import type { LevelUpData } from '#/game/battle/experience';
import { movesLearnedAt } from '#/game/battle/team-builder';
import { getPokemonData } from '#/game/pokemon-data';

/** What `gainExperience` needs to know about a species. */
export const levelUpDataFor = (species: string): LevelUpData => ({
    growthRate: getPokemonData(species).growthRate,
    baseHp: Dex.forGen(3).species.get(species).baseStats.hp,
    movesAt: level => movesLearnedAt(species, level),
});
