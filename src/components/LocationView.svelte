<script lang="ts">
  import type { Snippet } from 'svelte';
  import { canTravel, getRouteData } from '#/game/overworld/location.ts';
  import { DIRECTIONS } from '#/types/overworld/route-connections.ts';
  import { toConnection, type Connection } from '#/types/overworld/connection.ts';
  import type { GameFlags } from '#/types/game-flags.ts';
  import type { Location } from '#/types/overworld/location.ts';
  import { getAsset } from '#/utils/get-asset.ts';

  type Props = {
    location: Location;
    gameFlags: GameFlags;
    onTravel: (location: Location) => void;
    /** Extra sections rendered below the connections. */
    children?: Snippet;
  };

  let { location, gameFlags, onTravel, children }: Props = $props();

  let route = $derived(getRouteData(location));

  // Exits first (north/south/east/west), then inner areas.
  let connections = $derived<Connection[]>([
    ...DIRECTIONS.flatMap(d => {
      const id = route.connections[d];
      return id ? [toConnection(location, `${d[0].toUpperCase()}${d.slice(1)}`, id)] : [];
    }),
    ...route.connections.inner.map(id => toConnection(location, 'Inside', id)),
  ]);

  const isEnabled = (c: Connection) => !!c.target && canTravel(location, c.target, gameFlags);
</script>

<div class="layout">
  {#if route.image}
    <img class="map" src={getAsset(route.image)} alt={location} />
  {/if}

  <div class="panels">
    <section>
      <h2>Connections</h2>
      <div class="connections">
        {#each connections as c}
          <button disabled={!isEnabled(c)} onclick={() => c.target && onTravel(c.target)}>
            {c.label}
          </button>
        {:else}
          <p>None</p>
        {/each}
      </div>
    </section>
    {@render children?.()}
  </div>
</div>

<style>
  /* Phones / vertical screens: single column, image on top. */
  .layout { display: flex; flex-direction: column; align-items: center; gap: 1rem; text-align: center; }
  .map { max-width: 100%; height: auto; }
  .panels { display: flex; flex-direction: column; align-items: center; gap: 1rem; }
  .connections { display: flex; flex-wrap: wrap; justify-content: center; gap: 0.5rem; }

  /* Wide screens: image on the left, sections on the right. */
  @media (min-width: 900px) {
    .layout { flex-direction: row; align-items: flex-start; justify-content: center; }
    .map { flex: 1 1 50%; min-width: 0; }
    .panels { flex: 1 1 50%; min-width: 0; }
  }
</style>
