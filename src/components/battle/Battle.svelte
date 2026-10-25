<script lang="ts">
  import { onMount } from 'svelte';
  import { main as doBattle, submitChoice, resetBattleState } from '#/game/battle/battle.ts';
  import type { BattleOutcome } from '#/types/battle/battle-result';
  import type { PlayerControl } from '#/types/battle/battle-options';
  import type { Party, Team } from '#/types/pokemon';
  import SpriteRenderer from '#/components/battle/SpriteRenderer.svelte';
  import ButtonPanel from '#/components/battle/ButtonPanel.svelte';
  import BattleLog from '#/components/battle/BattleLog.svelte';

  type Props = {
    team1: Party;
    team2: Team;
    player1Control?: PlayerControl;
    onFinish: (outcome: BattleOutcome) => void;
  };

  let { team1, team2, player1Control = 'ui', onFinish }: Props = $props();
  let outcome = $state<BattleOutcome | null>(null);

  onMount(() => {
    resetBattleState();
    doBattle({ team1, team2, player1Control }).then(o => (outcome = o));
  });
</script>

<div class="battle">
  <BattleLog />
  <div class="sprites"><SpriteRenderer /></div>
  <ButtonPanel onChoice={submitChoice} />
  {#if outcome}
    <button class="continue" onclick={() => onFinish(outcome!)}>Continue</button>
  {/if}
</div>

<style>
  .sprites { margin-top: 16px; }
  .continue { display: block; margin: 16px auto 0; }
</style>
