<script lang="ts">
  import { getWildTeam } from '#/game/battle/team-builder.ts';
  import { getEncounters } from '#/game/overworld/location.ts';
  import GiftEncounter from '#/components/overworld/GiftEncounter.svelte';
  import type { GameFlag } from '#/types/game-flags.ts';
  import { ENCOUNTER_METHODS, type EncounterMethod } from '#/types/overworld/route-encounter.ts';
  import type { Player } from '#/types/player.ts';
  import type { Team } from '#/types/pokemon.ts';

  type Props = {
    player: Player;
    /** Encounters can't start (e.g. no Pokémon able to fight). */
    disabled?: boolean;
    /** Called with the wild Pokémon's team when an encounter starts. */
    onEncounter: (team: Team) => void;
  };

  let { player = $bindable(), disabled = false, onEncounter }: Props = $props();

  const METHOD_LABELS: Record<EncounterMethod, string> = {
    grass: 'Grass',
    surf: 'Surf',
    oldrod: 'Old Rod',
    goodrod: 'Good Rod',
    superrod: 'Super Rod',
    rocksmash: 'Rock Smash',
    gift: 'Gift',
    static: 'Static',
  };

  // Flag needed to trigger encounters of a method; the rest need none.
  const METHOD_FLAGS: Partial<Record<EncounterMethod, GameFlag>> = {
    surf: 'canSurf',
    oldrod: 'hasOldRod',
    goodrod: 'hasGoodRod',
    superrod: 'hasSuperRod',
    rocksmash: 'canRockSmash',
  };

  const isEnabled = (method: EncounterMethod) => {
    const flag = METHOD_FLAGS[method];
    return !flag || player.gameFlags[flag];
  };

  let encounters = $derived(getEncounters(player.location));
  // Methods available here and unlocked, in the order of ENCOUNTER_METHODS. Gifts have their own button.
  let methods = $derived(ENCOUNTER_METHODS.filter(m => encounters.some(e => e.method === m) && isEnabled(m)));

  async function start(method: EncounterMethod) {
    const pool = encounters.filter(e => e.method === method);
    const { species } = pool[Math.floor(Math.random() * pool.length)];
    onEncounter(await getWildTeam(player.location, species, { method }));
  }
</script>

{#if methods.length}
  <section>
    <h2>Wild Encounter</h2>
    {#each methods.filter(m => m !== 'gift') as method (method)}
      <button {disabled} onclick={() => start(method)}>{METHOD_LABELS[method]}</button>
    {/each}
    <GiftEncounter bind:player />
  </section>
{/if}
