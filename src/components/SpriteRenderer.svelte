<!-- src/components/SpriteRenderer.svelte -->
<script lang="ts">
  import { battleState } from '#/game/battle/battle.ts';
</script>

<div class="sprite-container">
  <div class="sprite-slot">
    {#if $battleState.p1Sprite}
      <img class:blink={$battleState.blink.p1} src={$battleState.p1Sprite} alt="Player Pokémon" />
    {/if}
  </div>
  <div class="sprite-slot">
    {#if $battleState.p2Sprite}
      <img class:blink={$battleState.blink.p2} src={$battleState.p2Sprite} alt="Opponent Pokémon" />
    {/if}
  </div>
</div>

<style>
  .sprite-container { display: flex; gap: 2rem; justify-content: center; }
  .sprite-slot { width: 120px; height: 120px; }
  .sprite-slot img { width: 100%; height: 100%; object-fit: contain; image-rendering: pixelated; }
  .sprite-slot:first-child img { transform: scaleX(-1); }
  .sprite-slot img.blink { animation: blink 0.2s ease-in-out 2; }
  @keyframes blink { 50% { opacity: 0.2; } }
</style>