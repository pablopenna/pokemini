<script lang="ts">
  import { getItemData } from '#/game/item/item-data.ts';
  import type { Inventory } from '#/types/inventory.ts';
  import { getAsset } from '#/utils/get-asset.ts';

  type Props = {
    inventory: Inventory;
    open?: boolean;
  };

  let { inventory, open = $bindable(false) }: Props = $props();

  let dialog = $state<HTMLDialogElement>();

  const items = $derived(inventory.map(item => {
    const data = getItemData(item.id);
    return {
      id: item.id,
      amount: item.amount,
      name: data?.name ?? item.id,
      sprite: data?.sprite,
      description: data?.description,
    };
  }));

  $effect(() => {
    if (!dialog) return;

    if (open && !dialog.open) dialog.showModal();
    else if (!open && dialog.open) dialog.close();
  });
</script>

<dialog
  bind:this={dialog}
  oncancel={() => (open = false)}
  onclose={() => (open = false)}
>
  <h2>Inventory</h2>

  {#if items.length}
    <ul class="inventory-grid">
      {#each items as item (item.id)}
        <li class="inventory-item" title={item.description || item.name}>
          <div class="icon">
            {#if item.sprite}
              <img src={getAsset(item.sprite)} alt="" />
            {/if}
            <span class="amount">×{item.amount}</span>
          </div>
          <span class="name">{item.name}</span>
        </li>
      {/each}
    </ul>
  {:else}
    <p class="empty">Your inventory is empty.</p>
  {/if}

  <form method="dialog"><button>Close</button></form>
</dialog>

<style>
  dialog {
    display: flex;
    flex-direction: column;
    box-sizing: border-box;
    width: min(32rem, 90vw);
    max-height: 80vh;
    overflow: hidden;
  }

  dialog::backdrop { background: rgb(0 0 0 / 0.5); }

  h2 { margin-top: 0; }

  .inventory-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(6rem, 1fr));
    gap: 0.5rem;
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    margin: 0 0 1rem;
    padding: 0;
    list-style: none;
  }

  .inventory-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.25rem;
    padding: 0.5rem;
    border: 1px solid #ccc;
    border-radius: 4px;
    text-align: center;
  }

  .icon { position: relative; }

  .icon img {
    width: 48px;
    height: 48px;
    object-fit: contain;
    image-rendering: pixelated;
  }

  .amount {
    position: absolute;
    right: -0.25rem;
    bottom: -0.25rem;
    font-size: 0.75rem;
    font-weight: bold;
    background: #fff;
    border-radius: 4px;
    padding: 0 0.2rem;
  }

  .name {
    font-size: 0.8rem;
    overflow-wrap: anywhere;
  }

  .empty { margin-bottom: 1rem; }

  form {
    flex-shrink: 0;
    margin: 0;
    text-align: right;
  }
</style>
