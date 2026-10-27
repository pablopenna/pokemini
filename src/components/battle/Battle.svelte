<script lang="ts">
  import { onMount } from 'svelte';
  import { main as doBattle, submitChoice, resetBattleState, battleState } from '#/game/battle/battle.ts';
  import { learnMove } from '#/game/battle/experience.ts';
  import type { BattleOutcome } from '#/types/battle/battle-result';
  import { PlayerControl } from '#/types/battle/battle-options';
  import type { Party, Team } from '#/types/pokemon';
  import SpriteRenderer from '#/components/battle/SpriteRenderer.svelte';
  import ButtonPanel from '#/components/battle/ButtonPanel.svelte';
  import BattleLog from '#/components/battle/BattleLog.svelte';
  import MoveLearnDialog from '#/components/battle/MoveLearnDialog.svelte';
  import InventoryDialog from '#/components/overworld/InventoryDialog.svelte';
  import type { Inventory } from '#/types/inventory.ts';

  type Props = {
    team1: Party;
    team2: Team;
    player1Control?: PlayerControl;
    wild?: boolean;
    inventory: Inventory;
    onFinish: (outcome: BattleOutcome) => void;
  };

  let { team1, team2, player1Control, wild = false, inventory, onFinish }: Props = $props();
  let inventoryOpen = $state(false);
  let outcome = $state<BattleOutcome | null>(null);

  // Moves waiting for the player to decide whether to forget another one.
  let pending = $derived(outcome?.pendingMoves[0]);

  function resolveMove(forget: number | null) {
    if (!outcome || !pending) return;
    const { index, move } = pending;
    const pokemon = outcome.party[index];
    const message = forget === null
      ? `${pokemon.name} did not learn ${move.name}.`
      : `${pokemon.name} forgot ${pokemon.moves[forget]} and learned ${move.name}!`;
    if (forget !== null) outcome.party[index] = learnMove(pokemon, move, forget);
    outcome.pendingMoves = outcome.pendingMoves.slice(1);
    battleState.update(s => ({ ...s, log: s.log + `<div>${message}</div>` }));
  }

  onMount(() => {
    resetBattleState();
    doBattle({ team1, team2, player1Control, wild }).then(o => (outcome = o));
  });
</script>

<div class="battle">
  <BattleLog />
  <div class="sprites"><SpriteRenderer /></div>
  <ButtonPanel onChoice={submitChoice} onUseItem={() => (inventoryOpen = true)} isWildEncounter={wild} />
  <InventoryDialog bind:open={inventoryOpen} {inventory} />
  {#if pending}
    {#key pending}
      <MoveLearnDialog pokemon={outcome!.party[pending.index]} move={pending.move} onChoose={resolveMove} />
    {/key}
  {:else if outcome}
    <button class="continue" onclick={() => onFinish(outcome!)}>Continue</button>
  {/if}
</div>

<style>
  .sprites { margin-top: 16px; }
  .continue { display: block; margin: 16px auto 0; }
</style>
