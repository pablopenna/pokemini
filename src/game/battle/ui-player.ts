import { BattleStreams } from '@pkmn/sim';
import type { Streams } from '@pkmn/sim';

// ChoiceRequest isn't publicly exported — derive it from the method signature.
export type ChoiceRequest = Parameters<BattleStreams.BattlePlayer['receiveRequest']>[0];
export type RequestHandler = (request: ChoiceRequest) => void;

export class UIPlayer extends BattleStreams.BattlePlayer {
  private onRequest: RequestHandler;

  constructor(
    playerStream: Streams.ObjectReadWriteStream<string>,
    onRequest: RequestHandler,
    debug = false,
  ) {
    super(playerStream, debug);
    this.onRequest = onRequest;
  }

  receiveRequest(request: ChoiceRequest) {
    // 'wait' requests require no action.
    if ('wait' in request && request.wait) return;

    // Surface the request to the UI. The UI will eventually call submitChoice().
    this.onRequest(request);
  }

  /** Call this from your UI when the user has picked a move/switch. */
  submitChoice(choice: string) {
    this.choose(choice);
  }

  /** Swallow "Unavailable choice" errors so the UI can re-submit. */
  receiveError(error: Error) {
    if (error.message.startsWith('[Unavailable choice]')) return;
    super.receiveError(error);
  }
}