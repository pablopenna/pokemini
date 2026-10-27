import type { Pokemon as SimPokemon } from '@pkmn/sim';
import { Dex } from '@pkmn/dex';
import { logLine } from '#/game/battle/battle-state';
import { gainExperience, learnMove } from '#/game/battle/experience';
import { readPartyState } from '#/game/battle/party-state';
import { movesLearnedAt } from '#/game/battle/team-builder';
import { getPokemonData } from '#/game/pokemon-data';
import type { Party, PartyPokemon } from '#/types/pokemon';

/** Asks the player which move `pokemon` forgets to learn `move`; null keeps the current ones. */
export type ChooseForgetMove = (pokemon: PartyPokemon, move: { name: string; pp: number }) => Promise<number | null>;

/**
 * Gives the experience earned so far to the Pokémon that earned it and clears it, logging what happens.
 * `sentParty` and `sentSim` are in the order the Pokémon were sent; `sentParty` is updated in place.
 * Moves that don't fit are offered to the player through `chooseForget`.
 */
export async function awardExperience(
    sentParty: Party,
    sentSim: SimPokemon[],
    earned: Map<SimPokemon, number>,
    chooseForget: ChooseForgetMove,
): Promise<void> {
    // Current HP and PP, since the party only holds them once the battle is over.
    const current = readPartyState(sentParty, sentSim);
    for (const [i, simMon] of sentSim.entries()) {
        const gained = earned.get(simMon);
        if (!gained) continue;
        const { species } = current[i];
        const data = getPokemonData(species);
        const gain = await gainExperience(current[i], gained, {
            growthRate: data.growthRate,
            baseHp: Dex.forGen(3).species.get(species).baseStats.hp,
            movesAt: level => movesLearnedAt(species, level),
        });
        // Bring the sim to the new level: its other stats are rebuilt from the set, and HP grows with the max.
        const grown = (gain.pokemon.hp ?? 0) - (current[i].hp ?? 0);
        (simMon as { level: number }).level = simMon.set.level = gain.pokemon.level; // typed read-only
        simMon.details = simMon.getUpdatedDetails();
        simMon.setSpecies(simMon.baseSpecies);
        simMon.hp += grown;
        simMon.maxhp += grown;
        simMon.baseMaxhp += grown;
        sentParty[i] = gain.pokemon;
        for (const message of gain.messages) logLine(message);

        for (const move of gain.pendingMoves) {
            const pokemon = sentParty[i];
            const forget = await chooseForget(pokemon, move);
            const name = pokemon.name || pokemon.species;
            if (forget === null) {
                logLine(`${name} did not learn ${move.name}.`);
                continue;
            }
            logLine(`${name} forgot ${pokemon.moves[forget]} and learned ${move.name}!`);
            sentParty[i] = learnMove(pokemon, move, forget);
        }
    }
    earned.clear();
}
