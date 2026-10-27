import type { Battle } from '@pkmn/client';
import { Sprites } from '@pkmn/img';
import { battleState } from '#/game/battle/battle-state';

const hpPercent = (p: { hp: number; maxhp: number } | null) =>
    p && p.maxhp ? (p.hp / p.maxhp) * 100 : 0;

/** Shows the active Pokémon of both sides with their level and HP bar. */
export function updateSprites(clientBattle: Battle) {
    const p1 = clientBattle.p1.active[0];
    const p2 = clientBattle.p2.active[0];
    battleState.update(s => ({
        ...s,
        p1Sprite: p1 ? Sprites.getPokemon(p1.species.id, { gen: 'gen5' }).url : null,
        p2Sprite: p2 ? Sprites.getPokemon(p2.species.id, { gen: 'gen5' }).url : null,
        p1Level: p1?.level ?? 1,
        p2Level: p2?.level ?? 1,
        p1Hp: hpPercent(p1),
        p2Hp: hpPercent(p2)
    }));
}

/** Turns the blink animation of a side's sprite on or off. */
export const setBlink = (side: 'p1' | 'p2', on: boolean) =>
    battleState.update(s => ({ ...s, blink: { ...s.blink, [side]: on } }));
