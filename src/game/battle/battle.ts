import { writable } from 'svelte/store';
import { BattleStreams, RandomPlayerAI, Teams } from '@pkmn/sim';
import type { Battle as SimBattle, Pokemon as SimPokemon } from '@pkmn/sim';
import { Battle } from '@pkmn/client';
import { Generations } from '@pkmn/data';
import { Dex } from '@pkmn/dex';
import { LogFormatter } from '@pkmn/view';
import { Sprites } from '@pkmn/img';
import { Protocol } from '@pkmn/protocol';
import { ChoiceBuilder } from '@pkmn/view';
import { UIPlayer, type ChoiceRequest } from '#/game/battle/ai/ui-player';
import { playEffect } from '#/game/battle/battle-animations';
import { gainExperience, trackExperience } from '#/game/battle/experience';
import { movesLearnedAt } from '#/game/battle/team-builder';
import { getPokemonData } from '#/game/pokemon-data';
import { applyPartyState, battleOrder, readPartyState, restoreOrder } from '#/game/battle/party-state';
import type { BattleOutcome, BattleResult, PendingMove } from '#/types/battle/battle-result';
import { PlayerControl, type BattleOptions } from '#/types/battle/battle-options';
import { useBattleItem } from '#/game/item/battle-item-use';
import { fail } from '#/game/item/item-use';
import type { Inventory } from '#/types/inventory';
import type { ItemId } from '#/types/item-id';
import type { ItemTarget, ItemUseFailure } from '#/types/item-usage';
import type { Party, PartyPokemon } from '#/types/pokemon';
import type { BallState } from '#/game/battle/catch/catch-animation';
import { throwBall } from '#/game/battle/catch/throw-ball';
import { getBattlerImplementationFromOption } from '#/game/battle/ai/get-battler-from-option';

// ---- reactive state -------------------------------------------------
const initialState = () => ({
    p1Sprite: null as string | null,
    p2Sprite: null as string | null,
    p1Level: -1,
    p2Level: -1,
    p1Hp: 100,
    p2Hp: 100,
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
    currentBuilder = null;
    battleState.set(initialState());
}

let currentBuilder: ChoiceBuilder | null = null;
let uiPlayer: UIPlayer | null = null;
// Whether the player is being asked for a move (items are used instead of one).
let awaitingAction = false;

/** What bag items need from the running battle. */
type ItemSession = {
    sim: SimBattle;
    wild: boolean;
    /** Sim Pokémon in the order they were sent, and the party they came from. */
    sentSim: SimPokemon[];
    sentParty: Party;
    /** `order[i]` is the party index of the i-th Pokémon sent. */
    order: number[];
    inventory: Inventory;
    /** Lets the next `pass` through for the active Pokémon: using an item takes the turn. */
    passNext: boolean;
    /** Ends the battle with the foe caught; set while the battle loop runs. */
    finishCatch: (caught: PartyPokemon) => void;
};
let itemSession: ItemSession | null = null;

function refreshBag() {
    const s = itemSession;
    if (!s) return;
    const party = restoreOrder(readPartyState(s.sentParty, s.sentSim), s.order);
    battleState.update(state => ({ ...state, party, inventory: s.inventory }));
}

// ---- UI helpers (update the store, not the DOM) ----------------------
function clearChoices() {
    awaitingAction = false;
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
    refreshBag();
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
        awaitingAction = true;
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

/**
 * Uses a bag item on the running battle. The effect is applied to the sim and the item takes the
 * player's turn, so the foe still moves. Only possible while the player is choosing a move.
 */
export function useBagItem(id: ItemId, target: ItemTarget): { ok: true; messages: string[] } | ItemUseFailure {
    const s = itemSession;
    if (!s || !awaitingAction) return fail('not-usable-here', "You can't use items right now.");

    const result = useBattleItem(id, target, {
        side: s.sim.sides[0],
        inventory: s.inventory,
        simPokemon: index => s.sentSim[s.order.indexOf(index)] ?? null,
        wild: s.wild,
    });
    if (!result.ok) return result;
    // Fleeing has no battle-loop support yet; the sim hasn't been touched for it.
    if (result.action.kind === 'catch') {
        useBall(s, id, result.action.rate, result.inventory);
        return { ok: true, messages: [] };
    }
    if (result.action.kind !== 'pass') return fail('not-usable-here', "That can't be used yet.");

    s.inventory = result.inventory;
    s.passNext = true;
    currentBuilder = null;
    uiPlayer?.submitChoice('pass');
    clearChoices();
    refreshBag();
    return { ok: true, messages: result.messages };
}

/** Takes the player's turn for a ball: it flies at the foe and either ends the battle or the foe breaks free. */
function useBall(s: ItemSession, ball: ItemId, rate: number | 'master', inventory: Inventory) {
    s.inventory = inventory;
    currentBuilder = null;
    clearChoices();
    refreshBag();

    void throwBall({
        foe: s.sim.sides[1].active[0],
        ball,
        rate,
        stage: {
            setBall: ball => battleState.update(state => ({ ...state, ball })),
            setFoeHidden: foeHidden => battleState.update(state => ({ ...state, foeHidden })),
        },
        log: message => battleState.update(state => ({ ...state, log: state.log + `<div>${message}</div>` })),
        onBrokeFree: () => {
            s.passNext = true;
            uiPlayer?.submitChoice('pass');
        },
        onCaught: s.finishCatch,
    });
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
        p1Level: p1?.level ?? 1,
        p2Level: p2?.level ?? 1,
        p1Hp: hpPercent(p1),
        p2Hp: hpPercent(p2)
    }));
}

// ---- main battle loop ------------------------------------------------
export async function main(options: BattleOptions): Promise<BattleOutcome> {
    const { team1, team2, player1Control = PlayerControl.UI, wild = false, inventory = [] } = options;
    // Accept everything: wild Pokémon like Pidgey are "Past" in gen 9, which the default filter hides.
    const gens = new Generations(Dex, () => true);
    const clientBattle = new Battle(gens);
    const formatter = new LogFormatter('p1', clientBattle);

    const simStream = new BattleStreams.BattleStream();
    const streams = BattleStreams.getPlayerStreams(simStream);
    const spec = { formatid: 'gen9customgame' };
    // Fainted Pokémon go last so the lead is able to fight.
    const order = battleOrder(team1);
    const sentParty = order.map(i => team1[i]);
    const p1spec = { name: 'Player', team: Teams.pack(sentParty) };
    const p2spec = { name: 'Bot', team: Teams.pack(team2) };

    currentBuilder = null;
    const player1 = getBattlerImplementationFromOption(player1Control, streams.p1, handleRequest, clientBattle);
    if(player1Control == PlayerControl.UI) uiPlayer = player1 as UIPlayer;
    const player2 = new RandomPlayerAI(streams.p2);

    let caught: PartyPokemon | null = null;
    let resolveCatch!: (result: BattleResult) => void;
    const catchEnded = new Promise<BattleResult>(resolve => (resolveCatch = resolve));

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
    // The write is synchronous and the players only react to it later, so the saved state is in place before anyone switches in.
    const sim = simStream.battle!;
    const sentSim = [...sim.sides[0].pokemon];
    applyPartyState(sim.sides[0], sentParty);
    const session: ItemSession = { sim, wild, sentSim, sentParty, order, inventory, passNext: false,
        finishCatch: mon => {
            caught = mon;
            resolveCatch('caught');
        },
    };
    // `pass` is refused for a Pokémon that can still move; allow it once when an item took the turn.
    const side = sim.sides[0];
    const choosePass = side.choosePass.bind(side);
    side.choosePass = () => {
        if (!session.passNext) return choosePass();
        session.passNext = false;
        side.choice.actions.push({ choice: 'pass' });
        return true;
    };
    itemSession = session;
    refreshBag();
    const earned = trackExperience(sim, foe => getPokemonData(foe.species.id).expYield);

    const result = await Promise.race([battleLoop(), catchEnded]);
    const party = readPartyState(sentParty, sentSim);
    itemSession = null;
    awaitingAction = false;
    const pending: PendingMove[] = [];
    for (const [i, simMon] of sentSim.entries()) {
        const gained = earned.get(simMon);
        if (!gained) continue;
        const { species } = party[i];
        const data = getPokemonData(species);
        const gain = await gainExperience(party[i], gained, {
            growthRate: data.growthRate,
            baseHp: Dex.forGen(3).species.get(species).baseStats.hp,
            movesAt: level => movesLearnedAt(species, level),
        });
        party[i] = gain.pokemon;
        pending.push(...gain.pendingMoves.map(move => ({ index: order[i], move })));
        const html = gain.messages.map(m => `<div>${m}</div>`).join('');
        battleState.update(s => ({ ...s, log: s.log + html }));
    }
    const finalParty = restoreOrder(party, order);
    if (caught) finalParty.push(caught);
    return { result, party: finalParty, inventory: session.inventory, pendingMoves: pending };
}