<script lang="ts">
  import InventoryDialog from '#/components/overworld/InventoryDialog.svelte';
  import PokemonDialog from '#/components/overworld/PokemonDialog.svelte';
  import { levelEvolution } from '#/game/battle/evolution';
  import { useOverworldItem } from '#/game/item/overworld-item-use';
  import type { ItemId } from '#/types/item-id';
  import { ItemScene as Scene, type ItemTarget } from '#/types/item-usage';
  import type { Player } from '#/types/player';

  type Props = {
    player: Player;
  };

  let { player = $bindable() }: Props = $props();

  let inventoryOpen = $state(false);
  let selected = $state<number | null>(null);

  function useItem(id: ItemId, target: ItemTarget) {
    const result = useOverworldItem(id, target, { party: player.team, inventory: player.inventory });
    if (!result.ok) return result;
    // Field effects (Escape Rope, Repel, ...) aren't handled yet; don't spend the item on them.
    if (result.events.length) return { ok: false as const, reason: 'not-usable-here' as const, message: "That can't be used yet." };
    player.team = result.party;
    player.inventory = result.inventory;
    return result;
  }
</script>

<div class="player-info">
  <p>Current location: {player.location}</p>
  <p>Team:</p>
  {#each player.team as pokemon, i}
    <button onclick={() => (selected = i)}>{pokemon.name || pokemon.species}{levelEvolution(pokemon) ? ' (*)' : ''}</button>
  {:else}
    <p>empty</p>
  {/each}
  <PokemonDialog
    pokemon={selected === null ? null : player.team[selected] ?? null}
    onEvolve={evolved => (player.team[selected!] = evolved)}
    onClose={() => (selected = null)}
  />
  <button onclick={() => (inventoryOpen = true)}>Inventory</button>
  <InventoryDialog bind:open={inventoryOpen} inventory={player.inventory} party={player.team} scene={Scene.Overworld} onUse={useItem} />
</div>

<style>
  .player-info { margin-bottom: 1.5rem; }
</style>
