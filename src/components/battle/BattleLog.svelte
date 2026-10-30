<script lang="ts">
  import { tick } from 'svelte';
  import { battleState } from '#/game/battle/battle.ts';

  let logEl: HTMLDivElement;

  $effect(() => {
    $battleState.log;
    tick().then(() => {
      logEl.scrollTop = logEl.scrollHeight;
    });
  });
</script>

<div class="battle-log" bind:this={logEl}>
  {@html $battleState.log}
</div>

<style>
  .battle-log {
    font-family: monospace;
    font-size: 13px;
    /* Smaller than before, and never taller than a fraction of the viewport. */
    flex: 0 1 auto;
    height: clamp(4rem, 15dvh, 7rem);
    min-height: 4rem;
    overflow-y: auto;
    padding: 0.5rem;
    border: 1px solid #ccc;
    background: #fafafa;
    white-space: pre-wrap;
  }
</style>