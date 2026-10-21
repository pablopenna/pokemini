<!-- src/components/ButtonPanel.svelte -->
<script lang="ts">
  import { battleState } from '#/game/battle/battle.ts';

  type Props = {
    onChoice: (choice: string) => void;
  };

  let { onChoice }: Props = $props();

  // DEBUG
  $effect(() => {
    console.log('MOVES', JSON.stringify($battleState.moves, null, 2));
    console.log('SWITCHES', JSON.stringify($battleState.switches, null, 2));
  });
</script>

<div class="button-panel">
  {#if $battleState.moves.length > 0}
    <h3>Moves</h3>
    {#each $battleState.moves as move}
      <button
        disabled={move.disabled}
        onclick={() => onChoice(move.choice)}
      >
        {move.label}
      </button>
    {/each}
  {/if}

  {#if $battleState.switches.length > 0}
    <h3>Switches</h3>
    {#each $battleState.switches as sw}
      <button onclick={() => onChoice(sw.choice)}>
        {sw.label}
      </button>
    {/each}
  {/if}
</div>

<style>
  .button-panel { display: flex; flex-direction: column; gap: 0.5rem; }
  button { padding: 0.5rem 1rem; text-align: left; }
</style>