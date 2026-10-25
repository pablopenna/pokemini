<script lang="ts">
  import { Teams } from '@pkmn/sim';
  import { TeamGenerators } from '@pkmn/randoms';
  import Battle from '#/components/Battle.svelte';
  import DebugMenu from '#/components/DebugMenu.svelte';
  import LocationView from '#/components/LocationView.svelte';
    import type { BattleResult } from '#/types/battle/battle-result';
  import { getWildTeam, buildLeveledPokemon } from '#/game/battle/team-builder';
  import { getRouteData } from '#/game/overworld/location';
  import { Location } from '#/types/overworld/location';
  import type { RouteEncounter } from '#/types/overworld/route-encounter';
  import type { Player } from '#/types/player';

  // Placeholder teams until the main page has real ones.
  Teams.setGeneratorFactory(TeamGenerators);
  const randomTeam = () => Teams.generate('gen9randombattle');

  let player = $state<Player>({ team: [], location: Location.PalletTown, gameFlags: { canSurf: false } });
  let opponentTeam = $state(randomTeam());

  const showDebugMenu = import.meta.env.GAME_DEBUG_MENU === 'true';

  // Main-screen state lives here and is untouched while the battle view is shown.
  let view = $state<'main' | 'battle'>('main');
  let lastResult = $state<BattleResult | null>(null);
  let inventoryDialog = $state<HTMLDialogElement>();

  function startBattle() {
    view = 'battle';
  }

  const MAX_TEAM_SIZE = 6;

  let encounters = $derived(getRouteData(player.location).encounters.filter(e => e.version !== 'leafgreen'));
  let wildEncounters = $derived(encounters.filter(e => e.method !== 'gift'));
  let gifts = $derived(encounters.filter(e => e.method === 'gift'));
  let receivedGifts = $state(new Set<string>());

  const giftKey = (g: RouteEncounter) => `${player.location}:${g.section}:${g.species}`;

  async function startWildEncounter() {
    const { species, method } = wildEncounters[Math.floor(Math.random() * wildEncounters.length)];
    opponentTeam = await getWildTeam(player.location, species, { method });
    view = 'battle';
  }

  async function receiveGift(gift: RouteEncounter) {
    if (player.team.length >= MAX_TEAM_SIZE) return;
    const key = giftKey(gift);
    if (receivedGifts.has(key)) return;
    receivedGifts.add(key);
    player.team.push(await buildLeveledPokemon(gift.species, gift.minLevel ?? 1));
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
    <div class="player-info">
      <p>Current location: {player.location}</p>
      <p>Team: {player.team.map(p => p.species).join(', ') || 'empty'}</p>
      <button onclick={() => inventoryDialog?.showModal()}>Inventory</button>
      <dialog bind:this={inventoryDialog}>
        <h2>Inventory</h2>
        <form method="dialog"><button>Close</button></form>
      </dialog>
    </div>
    {#if lastResult}
      <p>Last battle: {lastResult === 'p1' ? 'you won' : lastResult === 'p2' ? 'you lost' : 'tie'}</p>
    {/if}
    <LocationView location={player.location} gameFlags={player.gameFlags} onTravel={loc => (player.location = loc)}>
      {#if wildEncounters.length || gifts.length}
        <section>
          <h2>Interact</h2>
          {#if wildEncounters.length}
            <button onclick={startWildEncounter}>Wild Encounter</button>
          {/if}
          {#each gifts as gift (giftKey(gift))}
            <button
              disabled={receivedGifts.has(giftKey(gift)) || player.team.length >= MAX_TEAM_SIZE}
              onclick={() => receiveGift(gift)}
            >
              Receive {gift.species}
            </button>
          {/each}
        </section>
      {/if}
      <section>
        <h2>Battle</h2>
        <button onclick={startBattle}>Battle</button>
      </section>
    </LocationView>
  </main>
{/if}

<style>
  main { text-align: center; }
  .player-info { margin-bottom: 1.5rem; }
</style>
