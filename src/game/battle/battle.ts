import { BattleStreams, RandomPlayerAI, Teams } from '@pkmn/sim';
import { Battle } from '@pkmn/client';
import { Generations } from '@pkmn/data';
import { Dex } from '@pkmn/dex';
import { LogFormatter } from '@pkmn/view';
import { Protocol } from '@pkmn/protocol';
import { UIPlayer } from '#/game/battle/ai/ui-player';
import { getBattlerImplementationFromOption } from '#/game/battle/ai/get-battler-from-option';
import { endBagSession, refreshBag, startBagSession } from '#/game/battle/bag';
import { awardExperience } from '#/game/battle/battle-rewards';
import { appendLog, resetBattleState as resetState } from '#/game/battle/battle-state';
import { playEffect } from '#/game/battle/battle-animations';
import { clearChoices, handleRequest, resetChoices, setUiPlayer } from '#/game/battle/choices';
import { trackExperience } from '#/game/battle/experience';
import { applyPartyState, battleOrder, readPartyState, restoreOrder } from '#/game/battle/party-state';
import { setBlink, updateSprites } from '#/game/battle/sprites';
import { getPokemonData } from '#/game/pokemon-data';
import { PlayerControl, type BattleOptions } from '#/types/battle/battle-options';
import type { BattleOutcome, BattleResult } from '#/types/battle/battle-result';
import type { PartyPokemon } from '#/types/pokemon';

// What the UI uses to follow and drive a battle.
export { battleState } from '#/game/battle/battle-state';
export { submitChoice } from '#/game/battle/choices';
export { useBagItem } from '#/game/battle/bag';

export function resetBattleState() {
    resetChoices();
    resetState();
}

/** Runs a battle: wires the sim to the players and the UI, and settles what it leaves behind. */
export async function main(options: BattleOptions): Promise<BattleOutcome> {
    const { team1, team2, player1Control = PlayerControl.UI, wild = false, inventory = [], chooseForgetMove = async () => null } = options;
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

    resetChoices();
    const onRequest: typeof handleRequest = request => {
        handleRequest(request);
        refreshBag();
    };
    const player1 = getBattlerImplementationFromOption(player1Control, streams.p1, onRequest, clientBattle);
    setUiPlayer(player1Control == PlayerControl.UI ? (player1 as UIPlayer) : null);
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
                if (html) appendLog(html);
                updateSprites(clientBattle);
                await playEffect(args, setBlink);
                // The foe is `p2`; whoever stood against it earns experience as soon as it faints.
                if (args[0] === 'faint' && String(args[1]).startsWith('p2')) {
                    await awardExperience(sentParty, sentSim, earned, chooseForgetMove);
                    refreshBag();
                }
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
    startBagSession({
        sim, wild, sentSim, sentParty, order, inventory,
        finishCatch: mon => {
            caught = mon;
            resolveCatch('caught');
        },
    });
    const earned = trackExperience(sim, foe => getPokemonData(foe.species.id).expYield);

    const result = await Promise.race([battleLoop(), catchEnded]);
    const finalInventory = endBagSession();
    clearChoices();
    const finalParty = restoreOrder(readPartyState(sentParty, sentSim), order);
    if (caught) finalParty.push(caught);
    return { result, party: finalParty, inventory: finalInventory };
}
