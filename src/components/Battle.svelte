<script lang="ts">
  import { onMount } from 'svelte';
  import { main as doBattle, submitChoice, resetBattleState } from '#/game/battle/battle.ts';
  import { type BattleResult } from '#/types/battle-result';
  import SpriteRenderer from '#/components/SpriteRenderer.svelte';
  import ButtonPanel from '#/components/ButtonPanel.svelte';
  import BattleLog from '#/components/BattleLog.svelte';

  type Props = {
    onFinish: (result: BattleResult) => void;
  };

  let { onFinish }: Props = $props();
  let result = $state<BattleResult | null>(null);

  onMount(() => {
    resetBattleState();
    doBattle().then(r => (result = r));
  });
</script>

<div class="battle">
  <BattleLog />
  <div class="sprites"><SpriteRenderer /></div>
  <ButtonPanel onChoice={submitChoice} />
  {#if result}
    <button class="continue" onclick={() => onFinish(result!)}>Continue</button>
  {/if}
</div>

<style>
  .sprites { margin-top: 16px; }
  .continue { display: block; margin: 16px auto 0; }
</style>
