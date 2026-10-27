import type { Protocol } from '@pkmn/protocol';

const sfx = (name: string) => `${import.meta.env.BASE_URL}sfx/${name}.mp3`;
const SOUND_HIT = sfx('hit');
const SOUND_HEAL = sfx('heal');
const SOUND_DEBUFF = SOUND_HIT; // swap this line when a dedicated debuff sound exists
const BLINK_MS = 400; // keep in sync with the blink animation in SpriteRenderer.svelte

export const sleep = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms));

/** Resolves when the sound finishes (or immediately if it can't play). */
function playSound(src: string): Promise<void> {
    return new Promise(resolve => {
        const audio = new Audio(src);
        audio.addEventListener('ended', () => resolve());
        audio.addEventListener('error', () => resolve());
        audio.play().catch(() => resolve());
    });
}

type Side = 'p1' | 'p2';
/** Turns the blink animation on/off for a side's sprite (backed by the battle store). */
export type SetBlink = (side: Side, on: boolean) => void;

async function blinkSprite(side: Side, setBlink: SetBlink) {
    setBlink(side, true);
    await sleep(BLINK_MS);
    setBlink(side, false);
}

/** Plays the effect for a protocol line, if it has one. The battle loop awaits this. */
export async function playEffect(
    args: ReturnType<typeof Protocol.parseBattleLine>['args'],
    setBlink: SetBlink,
) {
    const side = String(args[1] ?? '').slice(0, 2);
    if (side !== 'p1' && side !== 'p2') return;
    switch (args[0]) {
        case '-damage':
            await Promise.all([blinkSprite(side, setBlink), playSound(SOUND_HIT)]);
            break;
        case '-heal':
        case '-boost':
            await playSound(SOUND_HEAL);
            break;
        case '-unboost':
            await playSound(SOUND_DEBUFF);
            break;
    }
}
