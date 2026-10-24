<script lang="ts">
  import { onMount } from 'svelte';
  import { main as doBattle, submitChoice, resetBattleState } from '#/game/battle/battle.ts';
  import SpriteRenderer from '#/components/SpriteRenderer.svelte';
  import ButtonPanel from '#/components/ButtonPanel.svelte';
  import BattleLog from '#/components/BattleLog.svelte';

  type Props = {
    onFinish: () => void;
  };

  let { onFinish }: Props = $props();
  let finished = $state(false);

  onMount(() => {
    resetBattleState();
    doBattle().then(() => (finished = true));
  });
</script>

<div class="battle">
  <BattleLog />
  <div class="sprites"><SpriteRenderer /></div>
  <ButtonPanel onChoice={submitChoice} />
  {#if finished}
    <button class="continue" onclick={onFinish}>Continue</button>
  {/if}
</div>

<style>
  .sprites { margin-top: 16px; }
  .continue { display: block; margin: 16px auto 0; }
</style>
