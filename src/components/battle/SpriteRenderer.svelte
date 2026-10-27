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
        <div class="hp-row">
          <span class="level">Lv{$battleState.p1Level}</span>
          <div class="hp-bar"><div class="hp-fill" class:low={$battleState.p1Hp <= 50} class:critical={$battleState.p1Hp <= 20} style:width="{$battleState.p1Hp}%"></div></div>
        </div>
      {/key}
    {/if}
  </div>
  <div class="sprite-slot">
    {#if $battleState.p2Sprite}
      <img class:blink={$battleState.blink.p2} class:hidden={$battleState.foeHidden} src={$battleState.p2Sprite} alt="Opponent Pokémon" />
      <!-- keyed on the sprite so a switch-in starts at its own HP instead of animating from the previous one -->
      {#key $battleState.p2Sprite}
        <div class="hp-row">
          <span class="level">Lv{$battleState.p2Level}</span>
          <div class="hp-bar"><div class="hp-fill" class:low={$battleState.p2Hp <= 50} class:critical={$battleState.p2Hp <= 20} style:width="{$battleState.p2Hp}%"></div></div>
        </div>
      {/key}
    {/if}
  </div>
  {#if $battleState.ball}
    {@const ball = $battleState.ball}
    <!-- one wrapper moves the ball sideways, the other lifts it, so the throw follows an arc -->
    <div class="ball-x {ball.phase}">
      <div class="ball-y {ball.phase}">
        {#key ball.n}<img class="ball {ball.phase}" src={ball.sprite} alt="" />{/key}
      </div>
    </div>
  {/if}
</div>

<style>
  .sprite-container { position: relative; display: flex; gap: 2rem; justify-content: center; }
  .sprite-slot { width: 120px; }
  .sprite-slot img { width: 100%; height: 120px; object-fit: contain; image-rendering: pixelated; }
  .sprite-slot:first-child img { transform: scaleX(-1); }
  .sprite-slot img.blink { animation: blink 0.2s ease-in-out 2; }
  @keyframes blink { 0% { opacity: 0.2; } 50% { opacity: 1; } }
  .sprite-slot img.hidden { opacity: 0; transform: scale(0.1); transition: opacity 0.3s, transform 0.3s; }
  /* Slot centers are 152px apart (120px slot + 2rem gap); the ball starts over the player's sprite. */
  .ball-x { position: absolute; top: 44px; left: calc(50% - 76px - 16px); }
  .ball-x.throw { animation: throw-x 0.7s linear forwards; }
  .ball-x:not(.throw) { transform: translateX(152px); }
  .ball-y.throw { animation: throw-y 0.7s forwards; }
  .ball-y:not(.throw) { transform: translateY(32px); }
  .ball { display: block; width: 32px; height: 32px; image-rendering: pixelated; }
  .ball.throw { animation: spin 0.7s linear forwards; }
  .ball.shake { animation: shake 0.8s ease-in-out; }
  .ball.caught { filter: brightness(0.6); }
  .ball.gone { animation: pop 0.3s ease-out forwards; }
  @keyframes throw-x { to { transform: translateX(152px); } }
  @keyframes throw-y {
    0% { transform: translateY(0); animation-timing-function: ease-out; }
    50% { transform: translateY(-36px); animation-timing-function: ease-in; }
    100% { transform: translateY(32px); }
  }
  @keyframes spin { to { transform: rotate(720deg); } }
  @keyframes shake {
    0%, 100% { transform: rotate(0); }
    25% { transform: rotate(-25deg); }
    75% { transform: rotate(25deg); }
  }
  @keyframes pop { to { transform: scale(1.8); opacity: 0; } }
  .hp-row { display: flex; align-items: center; gap: 4px; margin-top: 4px; }
  .level { font-size: 10px; font-weight: bold; color: #fff; text-shadow: 1px 1px 1px #000; }
  .hp-bar { flex: 1; height: 8px; background: #333; border-radius: 4px; overflow: hidden; }
  /* Duration matches BLINK_MS in battle-animations.ts so the bar finishes with the hit. */
  .hp-fill { height: 100%; background: #4c4; transition: width 0.4s linear, background-color 0.4s; }
  .hp-fill.low { background: #ec3; }
  .hp-fill.critical { background: #d33; }
</style>