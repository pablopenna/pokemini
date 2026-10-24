<script lang="ts">
  import { getRouteData, toLocation } from '#/game/overworld/location.ts';
  import { DIRECTIONS } from '#/types/overworld/route-connections.ts';
  import type { Location } from '#/types/overworld/location.ts';
  import { getAsset } from '#/utils/get-asset.ts';

  type Props = {
    location: Location;
    onTravel: (location: Location) => void;
  };

  let { location, onTravel }: Props = $props();

  let route = $derived(getRouteData(location));

  // Exits first (north/south/east/west), then inner areas.
  let connections = $derived([
    ...DIRECTIONS.flatMap(d => {
      const id = route.connections[d];
      return id ? [{ label: `${d[0].toUpperCase()}${d.slice(1)}: ${id}`, target: toLocation(id) }] : [];
    }),
    ...route.connections.inner.map(id => ({ label: `Inside: ${id}`, target: toLocation(id) })),
  ]);
</script>

{#if route.image}
  <img class="map" src={getAsset(route.image)} alt={location} />
{/if}

<section>
  <h2>Connections</h2>
  <div class="connections">
    {#each connections as c}
      <button disabled={!c.target} onclick={() => c.target && onTravel(c.target)}>{c.label}</button>
    {:else}
      <p>None</p>
    {/each}
  </div>
</section>

<style>
  .map { max-width: 100%; height: auto; }
  .connections { display: flex; flex-wrap: wrap; gap: 0.5rem; }
</style>
