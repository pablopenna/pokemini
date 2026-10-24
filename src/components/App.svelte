<script lang="ts">
  import { Teams } from '@pkmn/sim';
  import { TeamGenerators } from '@pkmn/randoms';
  import Battle from '#/components/Battle.svelte';
    import type { BattleResult } from '#/types/battle-result';
  import type { BattleOptions } from '#/types/battle-options';

  // Placeholder teams until the main page has real ones.
  Teams.setGeneratorFactory(TeamGenerators);
  const randomTeam = () => Teams.generate('gen9randombattle');
  let teams = $state<BattleOptions>({ team1: randomTeam(), team2: randomTeam(), player1Control: 'ui' });

  // Main-screen state lives here and is untouched while the battle view is shown.
  let view = $state<'main' | 'battle'>('main');
  let lastResult = $state<BattleResult | null>(null);

  function startBattle() {
    teams = { team1: randomTeam(), team2: randomTeam(), player1Control: 'ai' };
    view = 'battle';
  }

  function onBattleFinish(result: BattleResult) {
    lastResult = result;
    view = 'main';
  }
</script>

{#if view === 'battle'}
  <Battle {...teams} onFinish={onBattleFinish} />
{:else}
  <main>
    <h1>PokéMini</h1>
    {#if lastResult}
      <p>Last battle: {lastResult === 'p1' ? 'you won' : lastResult === 'p2' ? 'you lost' : 'tie'}</p>
    {/if}
    <button onclick={startBattle}>Battle</button>
  </main>
{/if}
