import { get } from 'svelte/store';
import type { Battle } from '@pkmn/client';
import { battleState } from '#/game/battle/battle-state';
import { expForLevel, MAX_LEVEL } from '#/game/battle/experience';
import { getPokemonData } from '#/game/pokemon-data';
import type { PartyPokemon } from '#/types/pokemon';

const hpPercent = (p: { hp: number; maxhp: number } | null) =>
    p && p.maxhp ? (p.hp / p.maxhp) * 100 : 0;

/** Local sprite path for a species, e.g. `/pokemon/default/front/murkrow.png`. */
const spritePath = (side: 'front' | 'back', species: string) =>
    `/pokemon/default/${side}/${species}.png`;

/** Shows the active Pokémon of both sides with their level and HP bar. */
export function updateSprites(clientBattle: Battle) {
    const p1 = clientBattle.p1.active[0];
    const p2 = clientBattle.p2.active[0];
    battleState.update(s => ({
        ...s,
        p1Sprite: p1 ? spritePath('back', p1.species.id) : null,
        p2Sprite: p2 ? spritePath('front', p2.species.id) : null,
        p1SimLevel: p1?.level ?? -1,
        p2Level: p2?.level ?? 1,
        p1Hp: hpPercent(p1),
        p2Hp: hpPercent(p2)
    }));
}

/** Turns the blink animation of a side's sprite on or off. */
export const setBlink = (side: 'p1' | 'p2', on: boolean) =>
    battleState.update(s => ({ ...s, blink: { ...s.blink, [side]: on } }));

/** Time for the EXP bar to be drawn empty before it fills again. */
const EXP_EMPTY_MS = 50;

/**
 * Shows the level and progress to the next level of the player's active Pokémon, as the party has them.
 * On a level-up the bar is emptied first and then fills up to the new progress.
 */
export async function updateExp(active: PartyPokemon | undefined) {
    if (!active) return;
    const rate = getPokemonData(active.species).growthRate;
    const floor = expForLevel(rate, active.level);
    const span = expForLevel(rate, active.level + 1) - floor;
    const progress = active.level >= MAX_LEVEL ? 0 : ((active.exp - floor) / span) * 100;
    const p1Exp = Math.max(0, Math.min(100, progress));
    // The sim keeps the level it started with, so the party is the one that knows a level-up.
    const leveledUp = active.level > get(battleState).p1Level && get(battleState).p1Level > 0;
    if (leveledUp) {
        battleState.update(s => ({ ...s, p1Level: active.level, p1Exp: 0, p1ExpSnap: true }));
        await new Promise(resolve => setTimeout(resolve, EXP_EMPTY_MS));
    }
    battleState.update(s => ({ ...s, p1Level: active.level, p1Exp, p1ExpSnap: false }));
}
