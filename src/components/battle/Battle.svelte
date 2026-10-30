<script lang="ts">
  import { onMount } from 'svelte';
  import { main as doBattle, submitChoice, useBagItem, resetBattleState, battleState } from '#/game/battle/battle.ts';
  import type { BattleOutcome } from '#/types/battle/battle-result';
  import { PlayerControl } from '#/types/battle/battle-options';
  import type { Party, Team } from '#/types/pokemon';
  import SpriteRenderer from '#/components/battle/SpriteRenderer.svelte';
  import ButtonPanel from '#/components/battle/ButtonPanel.svelte';
  import BattleLog from '#/components/battle/BattleLog.svelte';
  import MoveLearnPrompt from '#/components/battle/MoveLearnPrompt.svelte';
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

  let moveLearnPrompt = $state<MoveLearnPrompt>();

  function useItem(id: ItemId, target: ItemTarget) {
    const result = useBagItem(id, target);
    if (result.ok) inventoryOpen = false;
    return result;
  }

  onMount(() => {
    resetBattleState();
    doBattle({ team1, team2, player1Control, wild, inventory, chooseForgetMove: (pokemon, move) => moveLearnPrompt!.choose(pokemon, move) }).then(o => (outcome = o));
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
  <MoveLearnPrompt bind:this={moveLearnPrompt} />
  {#if outcome}
    <button class="continue" onclick={() => onFinish(outcome!)}>Continue</button>
  {/if}
</div>

<style>
  .battle {
    box-sizing: border-box;
    height: 100dvh;
    padding: 0.75rem 1rem;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    overflow: hidden;
  }
  .sprites { flex: 0 0 auto; margin-top: 0; }
  .continue { display: block; flex: 0 0 auto; margin: 0.5rem auto 0; }
</style>
