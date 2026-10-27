<script lang="ts">
  import { onMount } from 'svelte';
  import { main as doBattle, submitChoice, useBagItem, resetBattleState, battleState } from '#/game/battle/battle.ts';
  import type { BattleOutcome } from '#/types/battle/battle-result';
  import { PlayerControl } from '#/types/battle/battle-options';
  import type { Party, PartyPokemon, Team } from '#/types/pokemon';
  import SpriteRenderer from '#/components/battle/SpriteRenderer.svelte';
  import ButtonPanel from '#/components/battle/ButtonPanel.svelte';
  import BattleLog from '#/components/battle/BattleLog.svelte';
  import MoveLearnDialog from '#/components/battle/MoveLearnDialog.svelte';
  import InventoryDialog from '#/components/overworld/InventoryDialog.svelte';
  import type { Inventory } from '#/types/inventory.ts';
  import type { ItemId } from '#/types/item-id.ts';
  import type { ItemTarget } from '#/types/item-usage.ts';

  type Props = {
    team1: Party;
    team2: Team;
    player1Control?: PlayerControl;
    wild?: boolean;
    inventory: Inventory;
    onFinish: (outcome: BattleOutcome) => void;
  };

  let { team1, team2, player1Control, wild = false, inventory, onFinish }: Props = $props();
  let inventoryOpen = $state(false);
  let outcome = $state<BattleOutcome | null>(null);

  // A move waiting for the player to decide whether to forget another one.
  let learning = $state<{ pokemon: PartyPokemon; move: { name: string; pp: number }; resolve: (forget: number | null) => void } | null>(null);

  const chooseForgetMove = (pokemon: PartyPokemon, move: { name: string; pp: number }) =>
    new Promise<number | null>(resolve => (learning = { pokemon, move, resolve }));

  function resolveMove(forget: number | null) {
    learning?.resolve(forget);
    learning = null;
  }

  function useItem(id: ItemId, target: ItemTarget) {
    const result = useBagItem(id, target);
    if (result.ok) inventoryOpen = false;
    return result;
  }

  onMount(() => {
    resetBattleState();
    doBattle({ team1, team2, player1Control, wild, inventory, chooseForgetMove }).then(o => (outcome = o));
  });
</script>

<div class="battle">
  <BattleLog />
  <div class="sprites"><SpriteRenderer /></div>
  <ButtonPanel onChoice={submitChoice} onUseItem={() => (inventoryOpen = true)} isWildEncounter={wild} />
  <InventoryDialog
    bind:open={inventoryOpen}
    inventory={$battleState.inventory}
    party={$battleState.party}
    scene="battle"
    onUse={useItem}
  />
  {#if learning}
    {#key learning}
      <MoveLearnDialog pokemon={learning.pokemon} move={learning.move} onChoose={resolveMove} />
    {/key}
  {/if}
  {#if outcome}
    <button class="continue" onclick={() => onFinish(outcome!)}>Continue</button>
  {/if}
</div>

<style>
  .sprites { margin-top: 16px; }
  .continue { display: block; margin: 16px auto 0; }
</style>
