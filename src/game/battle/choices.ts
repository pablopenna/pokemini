import { ChoiceBuilder } from '@pkmn/view';
import type { UIPlayer, ChoiceRequest } from '#/game/battle/ai/ui-player';
import { battleState } from '#/game/battle/battle-state';

// What the player is currently being asked to pick, and where the answer goes.
let currentBuilder: ChoiceBuilder | null = null;
let uiPlayer: UIPlayer | null = null;
// Whether the player is being asked for a move (items are used instead of one).
let awaitingAction = false;

export const isAwaitingAction = () => awaitingAction;

/** Sets the player the choices are submitted to; null when no one picks through the UI. */
export function setUiPlayer(player: UIPlayer | null) {
    uiPlayer = player;
}

/** Forgets any half-made choice. */
export function resetChoices() {
    currentBuilder = null;
}

export function clearChoices() {
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
    const team: any[] = (request as any).side?.pokemon ?? [];
    const switches = team.map((pkmn, lead) => {
        // The chosen lead goes first; the others keep their order.
        const order = [lead, ...team.map((_, i) => i).filter(i => i !== lead)].map(i => i + 1).join('');
        return { label: pkmn.details, choice: `team ${order}` };
    });
    battleState.update(s => ({ ...s, switches }));
}

/** Shows what the sim asks the player to choose. */
export function handleRequest(request: ChoiceRequest) {
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
        awaitingAction = true;
        renderSwitches(request as any, false);
    }
}

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

/** Answers the current request with a pass: what using an item does to the player's turn. */
export function submitPass() {
    currentBuilder = null;
    uiPlayer?.submitChoice('pass');
    clearChoices();
}
