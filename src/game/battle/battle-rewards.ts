import type { Pokemon as SimPokemon } from '@pkmn/sim';
import { Dex } from '@pkmn/dex';
import { appendLog } from '#/game/battle/battle-state';
import { gainExperience } from '#/game/battle/experience';
import { movesLearnedAt } from '#/game/battle/team-builder';
import { getPokemonData } from '#/game/pokemon-data';
import type { PendingMove } from '#/types/battle/battle-result';
import type { Party } from '#/types/pokemon';

/**
 * Gives the experience earned in the battle to the Pokémon that earned it, logging what happens.
 * `party` and `sentSim` are in the order the Pokémon were sent; `order[i]` is the party index of the i-th one.
 * Returns the party with the new experience and the moves still waiting for the player's decision.
 */
export async function awardExperience(
    party: Party,
    sentSim: SimPokemon[],
    earned: Map<SimPokemon, number>,
    order: number[],
): Promise<{ party: Party; pending: PendingMove[] }> {
    const next = [...party];
    const pending: PendingMove[] = [];
    for (const [i, simMon] of sentSim.entries()) {
        const gained = earned.get(simMon);
        if (!gained) continue;
        const { species } = next[i];
        const data = getPokemonData(species);
        const gain = await gainExperience(next[i], gained, {
            growthRate: data.growthRate,
            baseHp: Dex.forGen(3).species.get(species).baseStats.hp,
            movesAt: level => movesLearnedAt(species, level),
        });
        next[i] = gain.pokemon;
        pending.push(...gain.pendingMoves.map(move => ({ index: order[i], move })));
        appendLog(gain.messages.map(m => `<div>${m}</div>`).join(''));
    }
    return { party: next, pending };
}
