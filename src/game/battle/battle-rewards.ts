import type { Pokemon as SimPokemon } from '@pkmn/sim';
import { logLine } from '#/game/battle/battle-state';
import { gainExperience, learnPendingMoves, type ChooseForgetMove } from '#/game/battle/experience';
import { readPartyState } from '#/game/battle/party-state';
import { levelUpDataFor } from '#/game/battle/level-up-data';
import type { Party } from '#/types/pokemon';

/**
 * Gives the experience earned so far to the Pokémon that earned it and clears it, logging what happens.
 * `sentParty` and `sentSim` are in the order the Pokémon were sent; `sentParty` is updated in place.
 * Moves that don't fit are offered to the player through `chooseForget`.
 * With `simScaled` the sim runs at a fixed level, so a level-up doesn't touch it.
 */
export async function awardExperience(
    sentParty: Party,
    sentSim: SimPokemon[],
    earned: Map<SimPokemon, number>,
    chooseForget: ChooseForgetMove,
    simScaled = false,
): Promise<void> {
    // Current HP and PP, since the party only holds them once the battle is over.
    const current = readPartyState(sentParty, sentSim);
    for (const [i, simMon] of sentSim.entries()) {
        const gained = earned.get(simMon);
        if (!gained) continue;
        const { species } = current[i];
        const gain = await gainExperience(current[i], gained, levelUpDataFor(species));
        if (!simScaled) {
            // Bring the sim to the new level: its other stats are rebuilt from the set, and HP grows with the max.
            const grown = (gain.pokemon.hp ?? 0) - (current[i].hp ?? 0);
            (simMon as { level: number }).level = simMon.set.level = gain.pokemon.level; // typed read-only
            simMon.details = simMon.getUpdatedDetails();
            simMon.setSpecies(simMon.baseSpecies);
            simMon.hp += grown;
            simMon.maxhp += grown;
            simMon.baseMaxhp += grown;
        }
        sentParty[i] = gain.pokemon;
        for (const message of gain.messages) logLine(message);

        sentParty[i] = await learnPendingMoves(sentParty[i], gain.pendingMoves, chooseForget, logLine);
    }
    earned.clear();
}
