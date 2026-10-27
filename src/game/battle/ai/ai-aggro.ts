import { BattleStreams } from '@pkmn/sim';
import { Dex } from '@pkmn/dex';
import type { Battle } from '@pkmn/client';

export type ChoiceRequest = Parameters<BattleStreams.BattlePlayer['receiveRequest']>[0];
export type RequestHandler = (request: ChoiceRequest) => void;

export class AiAggro extends BattleStreams.BattlePlayer {
  constructor(
    playerStream: any,
    private readonly clientBattle: Battle,
    debug = false,
  ) {
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
      const choices = request.forceSwitch.map((mustSwitch: boolean, _i: number) => {
        if (!mustSwitch) return 'pass';
        const canSwitch = [];
        for (let j = 1; j <= 6; j++) {
          if (!pokemon[j - 1]) continue;
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

      // Which side are we?  `request.side.id` is 'p1' | 'p2' | ...
      const myId = request.side.id as 'p1' | 'p2';
      const foeId = myId === 'p1' ? 'p2' : 'p1';
      const foeActive = this.clientBattle[foeId]?.active?.[0];
      // Pokemon.species.types is the canonical type array on @pkmn/client
      const targetTypes: readonly string[] = foeActive?.species.types ?? [];

      const choices = request.active.map((active: any, i: number) => {
        if (pokemon[i].condition.endsWith(' fnt') || pokemon[i].commanding) return 'pass';
        const moves = active.moves || [];
        let bestMoveIndex = -1;
        let bestScore = -1;

        // Attacker types — could also come from this.clientBattle[myId].active[i].species.types
        const activePokemon = pokemon[i];
        const speciesName = activePokemon.details?.split(',')[0].trim() ?? null;
        const speciesData = speciesName ? Dex.species.get(speciesName) : null;
        const attackerTypes: readonly string[] =
          (speciesData?.types as readonly string[]) ?? [];

        for (let j = 0; j < moves.length; j++) {
          const move = moves[j];
          if (move.disabled) continue;
          if (move.pp === 0 && move.maxpp && move.maxpp > 0) continue;

          const moveData = Dex.moves.get(move.move);
          const power = typeof moveData?.basePower === 'number' ? moveData.basePower : 0;
          const moveType = moveData?.type as string | undefined;
          const isStab = moveType && attackerTypes.includes(moveType);

          // Effective power against the *actual* foe, not a guessed one.
          let effectiveness = 0; // 0 -> neutral, 1 -> very effective, -1 -> not effective
          let is_immune = false;
          if (moveType && targetTypes.length > 0) {
            effectiveness = Dex.getEffectiveness(moveType, targetTypes as string[]);
            is_immune = !Dex.getImmunity(moveType, targetTypes as string[]); // Returns false if the target is immune; true otherwise.
          }

          let score = power;
          if (isStab) score *= 1.5;
          if (effectiveness == 1) score *= 2;
          if (effectiveness == -1) score *= 0.5;
          if (is_immune) score = 0;

          if (score > bestScore) {
            bestScore = score;
            bestMoveIndex = j;
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