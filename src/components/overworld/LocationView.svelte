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
    section: string;
    gameFlags: GameFlags;
    onTravel: (location: Location) => void;
    onSectionChange: (section: string) => void;
    /** Extra sections rendered below the connections. */
    children?: Snippet;
  };

  let { location, section, gameFlags, onTravel, onSectionChange, children }: Props = $props();

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
    {#if route.sections.length > 1}
      <section>
        <h2>Sections</h2>
        <div class="connections">
          {#each route.sections as s}
            <button disabled={s === section} onclick={() => onSectionChange(s)}>{s}</button>
          {/each}
        </div>
      </section>
    {/if}
    {@render children?.()}
  </div>
</div>

<style>
  /* Fill the height the main view leaves for the map and panels. */
  .layout {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.75rem;
    text-align: center;
    flex: 1 1 auto;
    width: 100%;
    min-height: 0;
  }
  .map {
    flex: 1 1 auto;
    min-height: 0;
    max-width: 100%;
    max-height: 100%;
    object-fit: contain;
  }
  .panels { display: flex; flex-direction: column; align-items: center; gap: 0.75rem; min-height: 0; overflow-y: auto; }
  .connections { display: flex; flex-wrap: wrap; justify-content: center; gap: 0.5rem; }

  /* Wide screens: image on the left, sections on the right. */
  @media (min-width: 900px) {
    .layout { flex-direction: row; align-items: stretch; justify-content: center; }
    .map { flex: 1 1 50%; min-width: 0; }
    .panels { flex: 1 1 50%; min-width: 0; justify-content: center; }
  }
</style>
