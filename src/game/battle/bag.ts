import type { Battle as SimBattle, Pokemon as SimPokemon } from '@pkmn/sim';
import { battleState, logLine } from '#/game/battle/battle-state';
import { clearChoices, isAwaitingAction, submitPass } from '#/game/battle/choices';
import { throwBall } from '#/game/battle/catch/throw-ball';
import { readPartyState, restoreOrder } from '#/game/battle/party-state';
import { useBattleItem } from '#/game/item/battle-item-use';
import { fail } from '#/game/item/item-use';
import type { Inventory } from '#/types/inventory';
import type { ItemId } from '#/types/item-id';
import type { ItemTarget, ItemUseFailure } from '#/types/item-usage';
import type { Party, PartyPokemon } from '#/types/pokemon';

/** What bag items need from the running battle. */
type BagSession = {
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
    /** Ends the battle with the foe caught. */
    finishCatch: (caught: PartyPokemon) => void;
};

let session: BagSession | null = null;

/** Starts letting the player use bag items in the battle `init.sim` is running. */
export function startBagSession(init: Omit<BagSession, 'passNext'>) {
    const s: BagSession = { ...init, passNext: false };
    // `pass` is refused for a Pokémon that can still move; allow it once when an item took the turn.
    const side = s.sim.sides[0];
    const choosePass = side.choosePass.bind(side);
    side.choosePass = () => {
        if (!s.passNext) return choosePass();
        s.passNext = false;
        side.choice.actions.push({ choice: 'pass' });
        return true;
    };
    session = s;
    refreshBag();
}

/** Stops bag use and returns the bag as the battle left it. */
export function endBagSession(): Inventory {
    const inventory = session?.inventory ?? [];
    session = null;
    return inventory;
}

/** Publishes the party and bag as the battle currently has them. */
export function refreshBag() {
    const s = session;
    if (!s) return;
    const party = restoreOrder(readPartyState(s.sentParty, s.sentSim), s.order);
    battleState.update(state => ({ ...state, party, inventory: s.inventory }));
}

/**
 * Uses a bag item on the running battle. The effect is applied to the sim and the item takes the
 * player's turn, so the foe still moves. Only possible while the player is choosing a move.
 */
export function useBagItem(id: ItemId, target: ItemTarget): { ok: true; messages: string[] } | ItemUseFailure {
    const s = session;
    if (!s || !isAwaitingAction()) return fail('not-usable-here', "You can't use items right now.");

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
    submitPass();
    refreshBag();
    return { ok: true, messages: result.messages };
}

/** Takes the player's turn for a ball: it flies at the foe and either ends the battle or the foe breaks free. */
function useBall(s: BagSession, ball: ItemId, rate: number | 'master', inventory: Inventory) {
    s.inventory = inventory;
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
        log: logLine,
        onBrokeFree: () => {
            s.passNext = true;
            submitPass();
        },
        onCaught: s.finishCatch,
    });
}
