import { BattleStreams } from '@pkmn/sim';
import { Dex } from '@pkmn/dex';

// ChoiceRequest isn't publicly exported — derive it from the method signature.
export type ChoiceRequest = Parameters<BattleStreams.BattlePlayer['receiveRequest']>[0];
export type RequestHandler = (request: ChoiceRequest) => void;

export class AiAggro extends BattleStreams.BattlePlayer {
  constructor(playerStream: any, debug = false) {
    super(playerStream, debug);
  }

  receiveError(error: Error) {
    if (error.message.startsWith('[Unavailable choice]')) return;
    super.receiveError(error);
  }

  receiveRequest(request: ChoiceRequest) {
    if ('wait' in request && request.wait) {
      return;
    }

    if ('forceSwitch' in request && request.forceSwitch) {
      const pokemon = request.side.pokemon;
      const chosen: number[] = [];
      const choices = request.forceSwitch.map((mustSwitch: boolean, i: number) => {
        if (!mustSwitch) return 'pass';
        const canSwitch = [];
        for (let j = 1; j <= 6; j++) {
          if (!pokemon[j - 1]) continue;
          // not active
          if (j > request.forceSwitch!.length || pokemon[i].reviving) {
            // continue check
          }
          if (j <= request.forceSwitch!.length && !pokemon[i].reviving && pokemon[j - 1].active) continue;
          if (chosen.includes(j)) continue;
          if (!pokemon[j - 1].condition.endsWith(' fnt') === !pokemon[i].reviving) {
            // basic check
          }
          if (pokemon[j - 1].condition.endsWith(' fnt')) continue;
          if (pokemon[j - 1].active) continue;
          if (chosen.includes(j)) continue;
          canSwitch.push(j);
        }
        if (!canSwitch.length) return 'pass';
        const target = canSwitch[0];
        chosen.push(target);
        return `switch ${target}`;
      });
      this.choose(choices.join(', '));
      return;
    }

    if ('teamPreview' in request && request.teamPreview) {
      const size = request.side?.pokemon?.length ?? 6;
      const order = Array.from({ length: size }, (_, i) => i + 1).join('');
      this.choose(`team ${order}`);
      return;
    }

    if ('active' in request && request.active?.[0]) {
      const pokemon = request.side.pokemon;
      const choices = request.active.map((active: any, i: number) => {
        if (pokemon[i].condition.endsWith(' fnt') || pokemon[i].commanding) return 'pass';
        const moves = active.moves || [];
        let bestMoveIndex = -1;
        let bestPower = -1;
        for (let j = 0; j < moves.length; j++) {
          const move = moves[j];
          if (move.disabled) continue;
          if (move.pp === 0 && move.maxpp && move.maxpp > 0) continue;
          const moveData = Dex.moves.get(move.move);
          const power = typeof moveData?.basePower === 'number' ? moveData.basePower : 0;
          if (power > bestPower) {
            bestPower = power;
            bestMoveIndex = j;
            if (bestPower === 0) {
              // Still could be a status move, but prefer damaging
            }
          }
        }
        if (bestMoveIndex === -1) {
          // Try to find any non-disabled move
          for (let j = 0; j < moves.length; j++) {
            if (!moves[j].disabled) {
              bestMoveIndex = j;
              break;
            }
          }
        }
        if (bestMoveIndex === -1) return 'pass';
        let moveChoice = `move ${bestMoveIndex + 1}`;
        if (request.active.length > 1) {
          // simple targeting
          if (request.active.length >= 2) moveChoice += ` 1`;
        }
        return moveChoice;
      });
      this.choose(choices.join(', '));
      return;
    }
  }
}
