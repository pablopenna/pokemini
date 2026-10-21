import { BattleStreams, RandomPlayerAI, Teams } from '@pkmn/sim';
import { TeamGenerators } from '@pkmn/randoms';
import { Battle } from '@pkmn/client';
import { Generations } from '@pkmn/data';
import { Dex } from '@pkmn/dex';
import { LogFormatter } from '@pkmn/view';
import { Sprites } from '@pkmn/img';
import { Protocol } from '@pkmn/protocol';
import { ChoiceBuilder } from '@pkmn/view';

import { UIPlayer, type ChoiceRequest } from '#/game/battle/ui-player';

export async function main() {
    // --- Setup ---
    Teams.setGeneratorFactory(TeamGenerators);

    const gens = new Generations(Dex);
    const clientBattle = new Battle(gens);
    const formatter = new LogFormatter('p1', clientBattle);

    const logEl = document.getElementById('battle-log')!;
    const p1SpriteEl = document.getElementById('p1-sprite')!;
    const p2SpriteEl = document.getElementById('p2-sprite')!;
    const movesEl = document.getElementById('moves')!;
    const teamEl = document.getElementById('team')!;

    const streams = BattleStreams.getPlayerStreams(new BattleStreams.BattleStream());
    const spec = { formatid: 'gen9randombattle' };
    const p1spec = { name: 'Player', team: Teams.pack(Teams.generate(spec.formatid)) };
    const p2spec = { name: 'Bot', team: Teams.pack(Teams.generate(spec.formatid)) };

    // --- UI rendering ---------------------------------------------------------

    let currentBuilder: ChoiceBuilder | null = null;

    function clearChoices() {
        movesEl.innerHTML = '';
        teamEl.innerHTML = '';
    }

    function updateChoiceUI() {
        if (!currentBuilder) return;

        // e.g., "Choose move for Pokémon 1 of 2"
        const remaining = currentBuilder.requestLength() - currentBuilder.index();
        if (remaining > 0) {
            // Re-render the move buttons for the next Pokémon.
            // For now, just log it — the player can click another move.
            console.log(`Need ${remaining} more choice(s)`);
        }
    }

    function makeButton(label: string, choice: string, disabled = false) {
        const btn = document.createElement('button');
        btn.textContent = label;
        btn.disabled = disabled;
        btn.addEventListener('click', () => {
            if (!currentBuilder) return;

            const error = currentBuilder.addChoice(choice);
            if (error) {
                // ChoiceBuilder returns a string on failure, not an exception.
                console.error('ChoiceBuilder error:', error);
                return;
            }

            if (currentBuilder.isDone()) {
                player1.submitChoice(currentBuilder.toString());
                clearChoices();
                currentBuilder = null;
            } else {
                // For doubles: update the UI to show the remaining choices.
                // For singles, isDone() will already be true after one choice.
                updateChoiceUI();
            }
        });
        return btn;
    }

    function renderMoves(request: ChoiceRequest & { active: any[] }) {
        const active = request.active[0];
        active.moves.forEach((move: any, i: number) => {
            const label = move.pp != null ? `${move.move} (${move.pp}/${move.maxpp})` : move.move;
            movesEl.appendChild(makeButton(label, `move ${i + 1}`, !!move.disabled));
        });
    }

    function renderSwitches(request: ChoiceRequest & { side: any }, _forced: boolean) {
        // Cannot switch out when trapped, unless the switch is forced.
        // if (!forced && request.active?.[0]?.trapped) return;

        request.side.pokemon.forEach((pkmn: any, i: number) => {
            if (pkmn.active) return;
            if (pkmn.condition.includes('fnt')) return;
            teamEl.appendChild(makeButton(pkmn.details, `switch ${i + 1}`));
        });
    }

    function renderTeamPreview(_request: ChoiceRequest) {
        // First pass: send a default ordering. Later, let the user drag to reorder.
        teamEl.appendChild(makeButton('Start Battle', 'team 123456'));
    }

    function handleRequest(request: ChoiceRequest) {
        clearChoices();

        if ('teamPreview' in request && request.teamPreview) {
            renderTeamPreview(request);
            return;
        }

        // Create the builder for this turn.
        currentBuilder = new ChoiceBuilder(request as any);

        if ('forceSwitch' in request && request.forceSwitch?.[0]) {
            renderSwitches(request as any, /* forced */ true);
            return;
        }

        if ('active' in request && request.active?.[0]) {
            renderMoves(request as any);
            renderSwitches(request as any, /* forced */ false);
        }
    }

    // --- Instantiate players --------------------------------------------------

    const player1 = new UIPlayer(streams.p1, handleRequest);
    const player2 = new RandomPlayerAI(streams.p2);

    // --- Sprite + log helpers (unchanged) -------------------------------------

    function updateSprites() {
        const p1Active = clientBattle.p1.active[0];
        const p2Active = clientBattle.p2.active[0];

        if (p1Active) {
            const { url, w, h, pixelated } = Sprites.getPokemon(p1Active.species.id, { gen: 'gen5' });
            p1SpriteEl.innerHTML = `<img src="${url}" width="${w}" height="${h}" ${pixelated ? 'style="image-rendering: pixelated;"' : ''} />`;
        }
        if (p2Active) {
            const { url, w, h, pixelated } = Sprites.getPokemon(p2Active.species.id, { gen: 'gen5' });
            p2SpriteEl.innerHTML = `<img src="${url}" width="${w}" height="${h}" ${pixelated ? 'style="image-rendering: pixelated;"' : ''} />`;
        }
    }

    // --- Start the battle ----------------------------------------------------

    const battleLoop = async () => {
        for await (const chunk of streams.omniscient) {
            for (const line of chunk.split('\n')) {
                if (!line) continue;

                const { args, kwArgs } = Protocol.parseBattleLine(line);

                const html = formatter.formatHTML(args, kwArgs);
                if (html) {
                    logEl.innerHTML += html;
                    logEl.scrollTop = logEl.scrollHeight;
                }

                clientBattle.add(args, kwArgs);
                updateSprites();
            }
        }
    };

    void player1.start();
    void player2.start();

    void streams.omniscient.write(
        `>start ${JSON.stringify(spec)}\n` +
        `>player p1 ${JSON.stringify(p1spec)}\n` +
        `>player p2 ${JSON.stringify(p2spec)}\n`
    );
    await battleLoop();
}
