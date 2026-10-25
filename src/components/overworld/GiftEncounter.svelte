<script lang="ts">
  import { buildLeveledPokemon } from '#/game/battle/team-builder.ts';
  import { getEncounters } from '#/game/overworld/location.ts';
  import { MAX_TEAM_SIZE } from '#/types/player.ts';
  import type { Player } from '#/types/player.ts';
  import type { RouteEncounter } from '#/types/overworld/route-encounter.ts';

  type Props = {
    player: Player;
  };

  let { player = $bindable() }: Props = $props();

  let gifts = $derived(getEncounters(player.location).filter(e => e.method === 'gift'));
  let dialog = $state<HTMLDialogElement>();

  async function choose(gift: RouteEncounter) {
    if (player.claimedGifts.includes(player.location) || player.team.length >= MAX_TEAM_SIZE) return;
    player.claimedGifts.push(player.location);
    dialog?.close();
    player.team.push(await buildLeveledPokemon(gift.species, gift.minLevel ?? 1));
  }
</script>

{#if gifts.length}
  <button
    disabled={player.claimedGifts.includes(player.location) || player.team.length >= MAX_TEAM_SIZE}
    onclick={() => dialog?.showModal()}
  >
    Gift
  </button>
  <dialog bind:this={dialog}>
    <h2>Choose a gift</h2>
    {#each gifts as gift}
      <button onclick={() => choose(gift)}>{gift.species} (Lv. {gift.minLevel ?? 1})</button>
    {/each}
    <form method="dialog"><button>Cancel</button></form>
  </dialog>
{/if}
