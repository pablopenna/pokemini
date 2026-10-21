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
    height: 400px;
    overflow-y: auto;
    padding: 0.5rem;
    border: 1px solid #ccc;
    background: #fafafa;
    white-space: pre-wrap;
  }
</style>