<!-- src/components/ButtonPanel.svelte -->
<script lang="ts">
  import { battleState } from '#/game/battle/battle.ts';

  type Props = {
    onChoice: (choice: string) => void;
    isWildEncounter: boolean;
    onUseItem: () => void;
  };

  let { onChoice, isWildEncounter, onUseItem }: Props = $props();

  // DEBUG
  $effect(() => {
    console.log('MOVES', JSON.stringify($battleState.moves, null, 2));
    console.log('SWITCHES', JSON.stringify($battleState.switches, null, 2));
  });
</script>

<div class="button-panel">
  {#if $battleState.moves.length > 0}
    <div class="button-section">
      <h3>Moves</h3>
      {#each $battleState.moves as move}
        <button disabled={move.disabled} onclick={() => onChoice(move.choice)}>
          {move.label}
        </button>
      {/each}
    </div>
  {/if}

  {#if $battleState.switches.length > 0}
    <div class="button-section">
      <h3>Switches</h3>
      {#each $battleState.switches as sw}
        <button onclick={() => onChoice(sw.choice)}>
          {sw.label}
        </button>
      {/each}
    </div>
  {/if}

  {#if $battleState.moves.length > 0 && isWildEncounter}
    <div class="button-section">
      <h3>Inventory</h3>
      <button onclick={onUseItem}>Use item</button>
    </div>
  {/if}
</div>

<style>
  .button-panel { display: flex; flex-direction: column; gap: 1rem; width: 100%; max-width: 100%; min-height: 0; overflow-x: hidden; overflow-y: auto; }
  .button-section { display: flex; flex-direction: row; gap: 0.5rem; justify-content: center; align-items: center; flex-wrap: wrap; width: 100%; }
  .button-section h3 { flex: 0 0 100%; width: 100%; text-align: center; margin: 0 0 0.25rem; }
  button {
    padding: 0.5rem 1rem;
    text-align: left;
    flex: 0 0 auto;
    min-width: initial;
    white-space: nowrap;
    /* Fixed width based on content + padding, will shrink to fit when stacked */
    min-width: 80px;
    width: fit-content;
  }
  @media (max-width: 768px) {
    .button-section { flex-direction: column; }
    .button-section h3 { flex: 0 0 auto; margin-right: 0; }
    button { flex: 0 0 auto; max-width: 100%; width: 100%; }
  }
  @media (max-width: 480px) {
    button { max-width: 100%; width: 100%; }
  }
</style>