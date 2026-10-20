import { BattleStreams, RandomPlayerAI, Teams } from '@pkmn/sim';
import { TeamGenerators } from '@pkmn/randoms';
import { Battle } from '@pkmn/client';
import { Generations } from '@pkmn/data';
import { Dex } from '@pkmn/dex';
import { LogFormatter } from '@pkmn/view';
import { Sprites } from '@pkmn/img';
import { Protocol } from '@pkmn/protocol';

// --- Setup ---
Teams.setGeneratorFactory(TeamGenerators);

const gens = new Generations(Dex);
const clientBattle = new Battle(gens);
const formatter = new LogFormatter('p1', clientBattle); // p1 perspective

const logEl = document.getElementById('battle-log')!;
const p1SpriteEl = document.getElementById('p1-sprite')!;
const p2SpriteEl = document.getElementById('p2-sprite')!;

const streams = BattleStreams.getPlayerStreams(new BattleStreams.BattleStream());
const spec = { formatid: 'gen9randombattle' };
const p1spec = { name: 'Bot 1', team: Teams.pack(Teams.generate(spec.formatid)) };
const p2spec = { name: 'Bot 2', team: Teams.pack(Teams.generate(spec.formatid)) };

const p1 = new RandomPlayerAI(streams.p1);
const p2 = new RandomPlayerAI(streams.p2);

// --- Helper to update sprites from the client battle state ---
function updateSprites() {
  const p1Active = clientBattle.p1.active[0];
  const p2Active = clientBattle.p2.active[0];

  if (p1Active) {
    const {url, w, h, pixelated} = Sprites.getPokemon(p1Active.species.id, {gen: 'gen5'});
    p1SpriteEl.innerHTML = `<img src="${url}" width="${w}" height="${h}" ${pixelated ? 'style="image-rendering: pixelated;"' : ''} />`;
  }
  if (p2Active) {
    const {url, w, h, pixelated} = Sprites.getPokemon(p2Active.species.id, {gen: 'gen5'});
    p2SpriteEl.innerHTML = `<img src="${url}" width="${w}" height="${h}" ${pixelated ? 'style="image-rendering: pixelated;"' : ''} />`;
  }
}

// --- Consume the omniscient stream and render ---
void (async () => {
  for await (const chunk of streams.omniscient) {
    for (const line of chunk.split('\n')) {
      if (!line) continue;

      const {args, kwArgs} = Protocol.parseBattleLine(line);

      // 1. Format *before* updating the client battle state (required by LogFormatter)
      const html = formatter.formatHTML(args, kwArgs);
      if (html) {
        logEl.innerHTML += html;
        logEl.scrollTop = logEl.scrollHeight; // Auto-scroll
      }

      // 2. Update the client battle state
      clientBattle.add(args, kwArgs);

      // 3. Update sprites after the state has changed
      updateSprites();
    }
  }
})();

// --- Start the battle ---
void p1.start();
void p2.start();

void streams.omniscient.write(`
>start ${JSON.stringify(spec)}
>player p1 ${JSON.stringify(p1spec)}
>player p2 ${JSON.stringify(p2spec)}
`);
