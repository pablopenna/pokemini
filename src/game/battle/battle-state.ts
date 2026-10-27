import { writable } from 'svelte/store';
import type { BallState } from '#/game/battle/catch/catch-animation';
import type { Inventory } from '#/types/inventory';
import type { Party } from '#/types/pokemon';

// ---- reactive state the battle UI renders -----------------------------
const initialState = () => ({
    p1Sprite: null as string | null,
    p2Sprite: null as string | null,
    p1Level: -1,
    p2Level: -1,
    /** Level the player's active Pokémon fights at, which differs from `p1Level` when the battle is leveled. */
    p1SimLevel: -1,
    p1Hp: 100,
    p2Hp: 100,
    /** Progress of the player's active Pokémon towards its next level, 0-100. */
    p1Exp: 0,
    /** Move the EXP bar without easing, to empty it on a level-up. */
    p1ExpSnap: false,
    blink: { p1: false, p2: false },
    moves: [] as { label: string; choice: string; disabled: boolean }[],
    switches: [] as { label: string; choice: string }[],
    log: '',
    /** The thrown ball, while one is on screen. */
    ball: null as BallState | null,
    /** The foe is inside a ball. */
    foeHidden: false,
    /** The player's party and bag as the battle currently has them. */
    party: [] as Party,
    inventory: [] as Inventory
});

export const battleState = writable(initialState());

export function resetBattleState() {
    battleState.set(initialState());
}

/** Appends a line to the battle log. */
export const logLine = (message: string) => appendLog(`<div>${message}</div>`);

/** Appends already formatted HTML to the battle log. */
export const appendLog = (html: string) => battleState.update(s => ({ ...s, log: s.log + html }));
