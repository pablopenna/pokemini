<script lang="ts">
  import { onMount } from 'svelte';
  import type { PartyPokemon } from '#/types/pokemon';

  type Props = {
    pokemon: PartyPokemon;
    move: { name: string; pp: number };
    /** The index of the move to forget, or null to keep the current ones. */
    onChoose: (forget: number | null) => void;
  };

  let { pokemon, move, onChoose }: Props = $props();

  let dialog = $state<HTMLDialogElement>();

  onMount(() => dialog?.showModal());
</script>

<!-- Esc is ignored: the player has to pick. -->
<dialog bind:this={dialog} oncancel={e => e.preventDefault()}>
  <h2>{pokemon.name} wants to learn {move.name}</h2>
  <p>It already knows four moves. Forget one to make room?</p>
  {#each pokemon.moves as known, i}
    <button onclick={() => onChoose(i)}>Forget {known}</button>
  {/each}
  <button onclick={() => onChoose(null)}>Don't learn {move.name}</button>
</dialog>

<style>
  dialog button { display: block; margin: 0.5rem auto; }
</style>
