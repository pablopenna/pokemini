<script lang="ts">
  import MoveLearnDialog from '#/components/battle/MoveLearnDialog.svelte';
  import type { ChooseForgetMove } from '#/game/battle/experience.ts';

  let learning = $state<{ pokemon: Parameters<ChooseForgetMove>[0]; move: Parameters<ChooseForgetMove>[1]; resolve: (forget: number | null) => void } | null>(null);

  /** Asks the player which move to forget so `pokemon` can learn `move`; null keeps the current ones. */
  export const choose: ChooseForgetMove = (pokemon, move) =>
    new Promise(resolve => (learning = { pokemon, move, resolve }));

  function resolveMove(forget: number | null) {
    learning?.resolve(forget);
    learning = null;
  }
</script>

{#if learning}
  {#key learning}
    <MoveLearnDialog pokemon={learning.pokemon} move={learning.move} onChoose={resolveMove} />
  {/key}
{/if}
