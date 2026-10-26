import { Battle } from "@pkmn/client";
import { BattleStreams, RandomPlayerAI, Streams } from "@pkmn/sim";
import { ChoiceRequest, UIPlayer } from "#/game/battle/ai/ui-player";
import { AiAggro } from "#/game/battle/ai/ai-aggro";
import { PlayerControl } from "#/types/battle/battle-options";

export function getBattlerImplementationFromOption(
    option: PlayerControl, 
    playerStream: Streams.ObjectReadWriteStream<string>,
    handleRequest: (request: ChoiceRequest) => void,
    clientBattle: Battle
): BattleStreams.BattlePlayer {
    switch(option) {
        case PlayerControl.UI:
            return new UIPlayer(playerStream, handleRequest);
        case PlayerControl.AI_RANDOM:
            return new RandomPlayerAI(playerStream);
        case PlayerControl.AI_AGGRO:
            return new AiAggro(playerStream, clientBattle);
        default:
            console.warn(`Unknown control type ${option}`);
            return new UIPlayer(playerStream, handleRequest);
    }
}