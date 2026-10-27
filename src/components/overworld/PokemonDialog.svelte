<script lang="ts">
  import { evolve, levelEvolution } from '#/game/battle/evolution.ts';
  import type { PartyPokemon } from '#/types/pokemon.ts';

  type Props = {
    pokemon: PartyPokemon | null;
    /** Called with the Pokémon after it evolves. */
    onEvolve: (evolved: PartyPokemon) => void;
    onClose: () => void;
  };

  let { pokemon, onEvolve, onClose }: Props = $props();

  let dialog = $state<HTMLDialogElement>();

  const evolution = $derived(pokemon && levelEvolution(pokemon));

  $effect(() => {
    if (pokemon && !dialog?.open) dialog?.showModal();
    else if (!pokemon && dialog?.open) dialog.close();
  });
</script>

<dialog bind:this={dialog} oncancel={onClose} onclose={onClose}>
  {#if pokemon}
    <h2>{pokemon.name || pokemon.species}</h2>
    {#if evolution}
      <button onclick={() => onEvolve(evolve(pokemon, evolution))}>Evolve</button>
    {/if}
  {/if}
  <button onclick={onClose}>Close</button>
</dialog>
