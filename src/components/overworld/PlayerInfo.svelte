<script lang="ts">
  import { healParty } from '#/game/battle/party-state';
  import type { Player } from '#/types/player';

  type Props = {
    player: Player;
  };

  let { player = $bindable() }: Props = $props();

  let inventoryDialog = $state<HTMLDialogElement>();
</script>

<div class="player-info">
  <p>Current location: {player.location}</p>
  <p>Team: {player.team.map(p => p.species).join(', ') || 'empty'}</p>
  <button onclick={() => (player.team = healParty(player.team))}>Heal team</button>
  <button onclick={() => inventoryDialog?.showModal()}>Inventory</button>
  <dialog bind:this={inventoryDialog}>
    <h2>Inventory</h2>
    <form method="dialog"><button>Close</button></form>
  </dialog>
</div>

<style>
  .player-info { margin-bottom: 1.5rem; }
</style>
