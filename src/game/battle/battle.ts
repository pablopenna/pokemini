import { writable } from 'svelte/store';
import { BattleStreams, RandomPlayerAI, Teams } from '@pkmn/sim';
import { Battle } from '@pkmn/client';
import { Generations } from '@pkmn/data';
import { Dex } from '@pkmn/dex';
import { LogFormatter } from '@pkmn/view';
import { Sprites } from '@pkmn/img';
import { Protocol } from '@pkmn/protocol';
import { ChoiceBuilder } from '@pkmn/view';
import { UIPlayer, type ChoiceRequest } from '#/game/battle/ui-player';
import { playEffect } from '#/game/battle/battle-animations';
import type { BattleResult } from '#/types/battle/battle-result';
import type { BattleOptions } from '#/types/battle/battle-options';

// ---- reactive state -------------------------------------------------
const initialState = () => ({
    p1Sprite: null as string | null,
    p2Sprite: null as string | null,
    p1Hp: 100,
    p2Hp: 100,
    blink: { p1: false, p2: false },
    moves: [] as { label: string; choice: string; disabled: boolean }[],
    switches: [] as { label: string; choice: string }[],
    log: ''
});

export const battleState = writable(initialState());

export function resetBattleState() {
    currentBuilder = null;
    battleState.set(initialState());
}

let currentBuilder: ChoiceBuilder | null = null;
let uiPlayer: UIPlayer | null = null;

// ---- UI helpers (update the store, not the DOM) ----------------------
function clearChoices() {
    battleState.update(s => ({ ...s, moves: [], switches: [] }));
}

function renderMoves(request: ChoiceRequest & { active: any[] }) {
    const active = request.active[0];
    const moves = active.moves.map((move: any, i: number) => ({
        label: move.pp != null ? `${move.move} (${move.pp}/${move.maxpp})` : move.move,
        choice: `move ${i + 1}`,
        disabled: !!move.disabled
    }));
    battleState.update(s => ({ ...s, moves }));
}

function renderSwitches(request: ChoiceRequest & { side: any }, _forced: boolean) {
    const switches: { label: string; choice: string }[] = [];
    request.side.pokemon.forEach((pkmn: any, i: number) => {
        if (pkmn.active || pkmn.condition.includes('fnt')) return;
        switches.push({ label: pkmn.details, choice: `switch ${i + 1}` });
    });
    battleState.update(s => ({ ...s, switches }));
}

function renderTeamPreview(request: ChoiceRequest) {
    const size = (request as any).side?.pokemon?.length ?? 6;
    const order = Array.from({ length: size }, (_, i) => i + 1).join('');
    battleState.update(s => ({
        ...s,
        switches: [{ label: 'Start Battle', choice: `team ${order}` }]
    }));
}

function handleRequest(request: ChoiceRequest) {
    console.log('REQ', JSON.stringify(request));    
    clearChoices();
    if ('teamPreview' in request && request.teamPreview) {
        renderTeamPreview(request);
        return;
    }
    // ChoiceBuilder dispatches on `requestType`, which the raw sim request lacks.
    const requestType = 'forceSwitch' in request && request.forceSwitch ? 'switch' : 'move';
    currentBuilder = new ChoiceBuilder({ ...request, requestType } as any);
    if ('forceSwitch' in request && request.forceSwitch?.[0]) {
        renderSwitches(request as any, true);
        return;
    }
    if ('active' in request && request.active?.[0]) {
        renderMoves(request as any);
        renderSwitches(request as any, false);
    }
}

// ---- public API for the UI ------------------------------------------
export function submitChoice(choice: string) {
    console.log('SUB', choice, 'builder=', currentBuilder? JSON.stringify(currentBuilder) : 'null');
    // Team preview has no ChoiceBuilder; the choice is already a complete command.
    if (!currentBuilder && choice.startsWith('team ')) {
        uiPlayer?.submitChoice(choice);
        clearChoices();
        return;
    }
    if (!currentBuilder) return;
    const error = currentBuilder.addChoice(choice);
    if (error) {
        console.error('ChoiceBuilder error:', error);
        return;
    }
    if (currentBuilder.isDone()) {
        uiPlayer?.submitChoice(currentBuilder.toString());
        clearChoices();
        currentBuilder = null;
    }
}

const hpPercent = (p: { hp: number; maxhp: number } | null) =>
    p && p.maxhp ? (p.hp / p.maxhp) * 100 : 0;

function updateSprites(clientBattle: Battle) {
    const p1 = clientBattle.p1.active[0];
    const p2 = clientBattle.p2.active[0];
    battleState.update(s => ({
        ...s,
        p1Sprite: p1 ? Sprites.getPokemon(p1.species.id, { gen: 'gen5' }).url : null,
        p2Sprite: p2 ? Sprites.getPokemon(p2.species.id, { gen: 'gen5' }).url : null,
        p1Hp: hpPercent(p1),
        p2Hp: hpPercent(p2)
    }));
}

// ---- main battle loop ------------------------------------------------
export async function main(options: BattleOptions): Promise<BattleResult> {
    const { team1, team2, player1Control = 'ui' } = options;
    // Accept everything: wild Pokémon like Pidgey are "Past" in gen 9, which the default filter hides.
    const gens = new Generations(Dex, () => true);
    const clientBattle = new Battle(gens);
    const formatter = new LogFormatter('p1', clientBattle);

    const streams = BattleStreams.getPlayerStreams(new BattleStreams.BattleStream());
    const spec = { formatid: 'gen9customgame' };
    const p1spec = { name: 'Player', team: Teams.pack(team1) };
    const p2spec = { name: 'Bot', team: Teams.pack(team2) };

    currentBuilder = null;
    const player1 = player1Control === 'ui'
        ? (uiPlayer = new UIPlayer(streams.p1, handleRequest))
        : (uiPlayer = null, new RandomPlayerAI(streams.p1));
    const player2 = new RandomPlayerAI(streams.p2);

    const battleLoop = async (): Promise<BattleResult> => {
        for await (const chunk of streams.omniscient) {
            console.log('RAW CHUNK', JSON.stringify(chunk));
            for (const line of chunk.split('\n')) {
                if (!line) continue;
                const { args, kwArgs } = Protocol.parseBattleLine(line);
                // Format before applying: the formatter diffs against the pre-update state.
                const html = formatter.formatHTML(args, kwArgs);
                clientBattle.add(args, kwArgs);
                if (html) battleState.update(s => ({ ...s, log: s.log + html }));
                updateSprites(clientBattle);
                await playEffect(args, (side, on) =>
                    battleState.update(s => ({ ...s, blink: { ...s.blink, [side]: on } })));
                if (args[0] === 'tie') return 'tie';
                if (args[0] === 'win') return args[1] === p1spec.name ? 'p1' : 'p2';
            }
        }
        return 'tie';
    };

    player1.start().catch(err => console.error('p1 start failed', err));
    player2.start().catch(err => console.error('p2 start failed', err));
    void streams.omniscient.write(
        `>start ${JSON.stringify(spec)}\n` +
        `>player p1 ${JSON.stringify(p1spec)}\n` +
        `>player p2 ${JSON.stringify(p2spec)}\n`
    );
    return battleLoop();
}