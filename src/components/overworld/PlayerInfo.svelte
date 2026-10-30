<script lang="ts">
  import InventoryDialog from '#/components/overworld/InventoryDialog.svelte';
  import MoveLearnPrompt from '#/components/battle/MoveLearnPrompt.svelte';
  import PokemonDialog from '#/components/overworld/PokemonDialog.svelte';
  import { levelEvolution } from '#/game/battle/evolution';
  import { useOverworldItem } from '#/game/item/overworld-item-use';
  import type { ItemId } from '#/types/item-id';
  import { ItemScene as Scene, type ItemTarget } from '#/types/item-usage';
  import type { Player } from '#/types/player';
  import { getAsset } from '#/utils/get-asset.ts';

  type Props = {
    player: Player;
  };

  let { player = $bindable() }: Props = $props();

  let inventoryOpen = $state(false);
  let moveLearnPrompt = $state<MoveLearnPrompt>();
  let selected = $state<number | null>(null);

  /** Local icon path for a species name (e.g. "Mr. Mime" -> /pokemon/default/icon/mrmime.png). */
  const iconPath = (species: string) =>
    getAsset(`/pokemon/default/icon/${species.toLowerCase().replace(/[^a-z0-9]/g, '')}.png`);

  async function useItem(id: ItemId, target: ItemTarget) {
    const result = await useOverworldItem(id, target, { party: player.team, inventory: player.inventory, chooseForget: moveLearnPrompt!.choose });
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
  <div class="team">
    {#each player.team as pokemon, i}
      <button class="team-member" onclick={() => (selected = i)}>
        <span class="team-member-content">
          <img class="icon" src={iconPath(pokemon.species)} alt="" />
          <span>{pokemon.name || pokemon.species}{levelEvolution(pokemon) ? ' (*)' : ''}</span>
        </span>
      </button>
    {:else}
      <p>empty</p>
    {/each}
  </div>
  <MoveLearnPrompt bind:this={moveLearnPrompt} />
  <PokemonDialog
    pokemon={selected === null ? null : player.team[selected] ?? null}
    onEvolve={evolved => (player.team[selected!] = evolved)}
    onClose={() => (selected = null)}
  />
  <div class="actions">
    <button onclick={() => (inventoryOpen = true)}>Inventory</button>
  </div>
  <InventoryDialog bind:open={inventoryOpen} inventory={player.inventory} party={player.team} scene={Scene.Overworld} onUse={useItem} />
</div>

<style>
  .player-info { margin-bottom: 1.5rem; }
  .team { display: flex; flex-wrap: wrap; align-items: center; justify-content: center; gap: 0.5rem; }
  /* Flex lives on an inner span: some browsers do not center flex children of a <button>. */
  .team-member { line-height: 1; }
  .team-member-content { display: inline-flex; align-items: center; gap: 0.35rem; }
  .icon { display: block; width: 24px; height: 24px; object-fit: contain; image-rendering: pixelated; }
  .actions { margin-top: 0.75rem; }
</style>
