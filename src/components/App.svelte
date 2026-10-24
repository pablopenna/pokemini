<script lang="ts">
  import Battle from '#/components/Battle.svelte';
    import type { BattleResult } from '#/types/battle-result';

  // Main-screen state lives here and is untouched while the battle view is shown.
  let view = $state<'main' | 'battle'>('main');
  let lastResult = $state<BattleResult | null>(null);

  function onBattleFinish(result: BattleResult) {
    lastResult = result;
    view = 'main';
  }
</script>

{#if view === 'battle'}
  <Battle onFinish={onBattleFinish} />
{:else}
  <main>
    <h1>PokéMini</h1>
    {#if lastResult}
      <p>Last battle: {lastResult === 'p1' ? 'you won' : lastResult === 'p2' ? 'you lost' : 'tie'}</p>
    {/if}
    <button onclick={() => (view = 'battle')}>Battle</button>
  </main>
{/if}
