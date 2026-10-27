<script lang="ts">
  import InventoryDialog from '#/components/overworld/InventoryDialog.svelte';
  import type { Player } from '#/types/player';

  type Props = {
    player: Player;
  };

  let { player = $bindable() }: Props = $props();

  let inventoryOpen = $state(false);
</script>

<div class="player-info">
  <p>Current location: {player.location}</p>
  <p>Team: {player.team.map(p => p.species).join(', ') || 'empty'}</p>
  <button onclick={() => (inventoryOpen = true)}>Inventory</button>
  <InventoryDialog bind:open={inventoryOpen} inventory={player.inventory} />
</div>

<style>
  .player-info { margin-bottom: 1.5rem; }
</style>
