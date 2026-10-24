<script lang="ts">
  import Battle from '#/components/Battle.svelte';

  // Main-screen state lives here and is untouched while the battle view is shown.
  let view = $state<'main' | 'battle'>('main');
</script>

{#if view === 'battle'}
  <Battle onFinish={() => (view = 'main')} />
{:else}
  <main>
    <h1>PokéMini</h1>
    <button onclick={() => (view = 'battle')}>Battle</button>
  </main>
{/if}
