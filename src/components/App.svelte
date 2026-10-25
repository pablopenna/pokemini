<script lang="ts">
  import { Teams } from '@pkmn/sim';
  import { TeamGenerators } from '@pkmn/randoms';
  import Battle from '#/components/battle/Battle.svelte';
  import DebugMenu from '#/components/overworld/DebugMenu.svelte';
  import LocationView from '#/components/overworld/LocationView.svelte';
  import PlayerInfo from '#/components/overworld/PlayerInfo.svelte';
  import TrainerBattle from '#/components/overworld/TrainerBattle.svelte';
  import WildEncounter from '#/components/overworld/WildEncounter.svelte';
  import { canBattle } from '#/game/battle/party-state';
  import { getRouteData } from '#/game/overworld/location';
  import type { BattleOutcome, BattleResult } from '#/types/battle/battle-result';
  import { Location } from '#/types/overworld/location';
  import type { Player } from '#/types/player';
  import type { Team } from '#/types/pokemon';

  // Placeholder teams until the main page has real ones.
  Teams.setGeneratorFactory(TeamGenerators);
  let player = $state<Player>({
    team: [],
    location: Location.PalletTown,
    section: getRouteData(Location.PalletTown).sections[0],
    gameFlags: {
      canSurf: false,
      hasOldRod: false,
      hasGoodRod: false,
      hasSuperRod: false,
      canRockSmash: false,
    },
    claimedGifts: [],
  });
  let opponentTeam = $state<Team>([]);

  const showDebugMenu = import.meta.env.GAME_DEBUG_MENU === 'true';

  // Main-screen state lives here and is untouched while the battle view is shown.
  let view = $state<'main' | 'battle'>('main');
  let lastResult = $state<BattleResult | null>(null);

  function startBattle(team: Team) {
    opponentTeam = team;
    view = 'battle';
  }

  // Every location starts in its first section.
  function travel(location: Location) {
    player.location = location;
    player.section = getRouteData(location).sections[0];
  }

  function onBattleFinish({ result, party }: BattleOutcome) {
    player.team = party;
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
    <PlayerInfo bind:player />
    {#if lastResult}
      <p>Last battle: {lastResult === 'p1' ? 'you won' : lastResult === 'p2' ? 'you lost' : 'tie'}</p>
    {/if}
    <LocationView
      location={player.location}
      section={player.section}
      gameFlags={player.gameFlags}
      onTravel={travel}
      onSectionChange={section => (player.section = section)}
    >
      <WildEncounter bind:player disabled={!canBattle(player.team)} onEncounter={startBattle} />
      <TrainerBattle {player} disabled={!canBattle(player.team)} onBattle={startBattle} />
    </LocationView>
  </main>
{/if}

<style>
  main { text-align: center; }
</style>
