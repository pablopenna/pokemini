import type { Battle as SimBattle, Pokemon as SimPokemon, Side } from '@pkmn/sim';
import type { Party, PartyPokemon, Pokemon } from '#/types/pokemon';

export const isFainted = (p: PartyPokemon) => p.hp === 0;

/** Whether the party has anyone able to fight. */
export const canBattle = (party: Party) => party.some(p => !isFainted(p));

/** Party with every Pokémon at full HP, PP and no status. */
export const healParty = (party: Party): Party =>
  party.map(p => ({ ...p, hp: null, pp: null, status: '' }));

/** A freshly obtained Pokémon: full HP and PP, no status. Experience is not tracked yet. */
export const toPartyPokemon = (p: Pokemon): PartyPokemon =>
  ({ ...p, exp: 0, hp: null, status: '', pp: null });

/** Order the party is sent to the sim: fainted last, so they are never the lead. Holds indexes into `party`. */
export const battleOrder = (party: Party): number[] =>
  party.map((_, i) => i).sort((a, b) => Number(isFainted(party[a])) - Number(isFainted(party[b])));

/** Puts the saved HP, PP and status on the sim's Pokémon. `party` must be in the order they were sent. */
export function applyPartyState(side: Side, party: Party) {
  side.pokemon.forEach((sim, i) => {
    const saved = party[i];

    saved.pp?.forEach((pp, k) => {
      const slot = sim.baseMoveSlots[k];
      if (slot) slot.pp = Math.min(pp, slot.maxpp);
    });

    if (saved.hp === 0) {
      sim.hp = 0;
      sim.fainted = true;
      sim.status = 'fnt' as SimPokemon['status'];
      side.pokemonLeft--;
      return;
    }
    if (saved.hp !== null) sim.hp = Math.min(saved.hp, sim.maxhp);
    if (saved.status) setStatusSilently(sim, saved.status);
  });
}

// Like `setStatus`, but without the start event, which would log "-status" before the Pokémon is out.
function setStatusSilently(sim: SimPokemon, status: string) {
  const battle: SimBattle = sim.battle;
  sim.status = status as SimPokemon['status'];
  sim.statusState = battle.initEffectState({
    id: status,
    target: sim,
    // What the start event of sleep and toxic would have set.
    time: battle.random(2, 5),
    skippedTime: 0,
    stage: 0,
  });
}

/** Party after the battle. `sent` and `sim` are in the order the Pokémon were sent (the sim reorders `side.pokemon` when switching). */
export function readPartyState(sent: Party, sim: SimPokemon[]): Party {
  return sim.map((sim, i) => {
    const before = sent[i];
    const fainted = sim.fainted || !sim.hp;
    return {
      ...before,
      hp: fainted ? 0 : sim.hp,
      status: fainted || !sim.status ? '' : sim.status,
      pp: before.moves.map((_, k) => sim.baseMoveSlots[k]?.pp ?? 0),
    };
  });
}

/** Undoes `battleOrder`: puts each Pokémon of a party in the sent order back where it was. */
export function restoreOrder(sent: Party, order: number[]): Party {
  const party: Party = [];
  order.forEach((original, i) => (party[original] = sent[i]));
  return party;
}
