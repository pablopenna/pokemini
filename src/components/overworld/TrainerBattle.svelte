<script lang="ts">
  import { buildTrainerTeam } from '#/game/battle/team-builder.ts';
  import { getRouteData } from '#/game/overworld/location.ts';
  import type { Player } from '#/types/player.ts';
  import type { Team } from '#/types/pokemon.ts';

  type Props = {
    player: Player;
    /** Battles can't start (e.g. no Pokémon able to fight). */
    disabled?: boolean;
    /** Called with the trainer's team when the battle starts. */
    onBattle: (team: Team) => void;
  };

  let { player, disabled = false, onBattle }: Props = $props();

  let trainers = $derived(getRouteData(player.location).trainers.filter(t => t.section === player.section));

  function start() {
    onBattle(buildTrainerTeam(trainers[Math.floor(Math.random() * trainers.length)]));
  }
</script>

{#if trainers.length}
  <section>
    <h2>Battle</h2>
    <button {disabled} onclick={start}>Battle</button>
  </section>
{/if}
