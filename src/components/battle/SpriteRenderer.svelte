<!-- src/components/SpriteRenderer.svelte -->
<script lang="ts">
  import { battleState } from '#/game/battle/battle.ts';
</script>

<div class="sprite-container">
  <div class="sprite-slot">
    {#if $battleState.p1Sprite}
      <img class:blink={$battleState.blink.p1} src={$battleState.p1Sprite} alt="Player Pokémon" />
      <!-- keyed on the sprite so a switch-in starts at its own HP instead of animating from the previous one -->
      {#key $battleState.p1Sprite}
        <div class="hp-bar"><div class="hp-fill" class:low={$battleState.p1Hp <= 50} class:critical={$battleState.p1Hp <= 20} style:width="{$battleState.p1Hp}%"></div></div>
      {/key}
    {/if}
  </div>
  <div class="sprite-slot">
    {#if $battleState.p2Sprite}
      <img class:blink={$battleState.blink.p2} src={$battleState.p2Sprite} alt="Opponent Pokémon" />
      <!-- keyed on the sprite so a switch-in starts at its own HP instead of animating from the previous one -->
      {#key $battleState.p2Sprite}
        <div class="hp-bar"><div class="hp-fill" class:low={$battleState.p2Hp <= 50} class:critical={$battleState.p2Hp <= 20} style:width="{$battleState.p2Hp}%"></div></div>
      {/key}
    {/if}
  </div>
</div>

<style>
  .sprite-container { display: flex; gap: 2rem; justify-content: center; }
  .sprite-slot { width: 120px; }
  .sprite-slot img { width: 100%; height: 120px; object-fit: contain; image-rendering: pixelated; }
  .sprite-slot:first-child img { transform: scaleX(-1); }
  .sprite-slot img.blink { animation: blink 0.2s ease-in-out 2; }
  @keyframes blink { 0% { opacity: 0.2; } 50% { opacity: 1; } }
  .hp-bar { height: 8px; margin-top: 4px; background: #333; border-radius: 4px; overflow: hidden; }
  /* Duration matches BLINK_MS in battle-animations.ts so the bar finishes with the hit. */
  .hp-fill { height: 100%; background: #4c4; transition: width 0.4s linear, background-color 0.4s; }
  .hp-fill.low { background: #ec3; }
  .hp-fill.critical { background: #d33; }
</style>