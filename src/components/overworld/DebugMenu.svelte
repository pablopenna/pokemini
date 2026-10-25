<script lang="ts">
  import type { GameFlags } from '#/types/game-flags.ts';

  type Props = {
    gameFlags: GameFlags;
  };

  let { gameFlags = $bindable() }: Props = $props();

  let open = $state(false);
  let dialog: HTMLDialogElement;

  function openFlags() {
    open = false;
    dialog.showModal();
  }
</script>

<div class="debug-menu">
  <button onclick={() => (open = !open)}>Debug {open ? '▴' : '▾'}</button>
  {#if open}
    <ul>
      <li><button onclick={openFlags}>Set Game Flags</button></li>
    </ul>
  {/if}
</div>

<dialog bind:this={dialog}>
  <h2>Game Flags</h2>
  {#each Object.keys(gameFlags) as key (key)}
    <label>
      <input type="checkbox" bind:checked={gameFlags[key as keyof GameFlags]} />
      {key}
    </label>
  {/each}
  <form method="dialog"><button>Close</button></form>
</dialog>

<style>
  .debug-menu { position: relative; text-align: left; }
  ul {
    position: absolute;
    z-index: 10;
    margin: 0;
    padding: 0.25rem;
    list-style: none;
    background: Canvas;
    border: 1px solid #ccc;
  }
  dialog label { display: block; margin: 0.5rem 0; }
</style>
