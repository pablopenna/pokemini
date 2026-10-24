<script lang="ts">
  import { Teams } from '@pkmn/sim';
  import { TeamGenerators } from '@pkmn/randoms';
  import Battle from '#/components/Battle.svelte';
  import DebugMenu from '#/components/DebugMenu.svelte';
  import LocationView from '#/components/LocationView.svelte';
    import type { BattleResult } from '#/types/battle/battle-result';
  import { Location } from '#/types/overworld/location';
  import type { Player } from '#/types/player';

  // Placeholder teams until the main page has real ones.
  Teams.setGeneratorFactory(TeamGenerators);
  const randomTeam = () => Teams.generate('gen9randombattle');

  let player = $state<Player>({ team: randomTeam(), location: Location.PalletTown, gameFlags: { canSurf: false } });
  let opponentTeam = $state(randomTeam());

  const showDebugMenu = import.meta.env.GAME_DEBUG_MENU === 'true';

  // Main-screen state lives here and is untouched while the battle view is shown.
  let view = $state<'main' | 'battle'>('main');
  let lastResult = $state<BattleResult | null>(null);

  function startBattle() {
    opponentTeam = randomTeam();
    view = 'battle';
  }

  function onBattleFinish(result: BattleResult) {
    lastResult = result;
    view = 'main';
  }
</script>

{#if view === 'battle'}
  <Battle team1={player.team} team2={opponentTeam} player1Control="ai" onFinish={onBattleFinish} />
{:else}
  <main>
    {#if showDebugMenu}
      <DebugMenu bind:gameFlags={player.gameFlags} />
    {/if}
    <h1>PokéMini</h1>
    <p>Current location: {player.location}</p>
    {#if lastResult}
      <p>Last battle: {lastResult === 'p1' ? 'you won' : lastResult === 'p2' ? 'you lost' : 'tie'}</p>
    {/if}
    <LocationView location={player.location} gameFlags={player.gameFlags} onTravel={loc => (player.location = loc)}>
      <section>
        <h2>Battle</h2>
        <button onclick={startBattle}>Battle</button>
      </section>
    </LocationView>
  </main>
{/if}

<style>
  main { text-align: center; }
</style>
