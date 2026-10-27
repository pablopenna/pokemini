<script lang="ts">
  import { getItemEffects, targetKindOf, type TargetKind } from '#/game/item/item-effects.ts';
  import { getItemData } from '#/game/item/item-data.ts';
  import { partyMaxHp } from '#/game/pokemon-stats.ts';
  import type { Inventory } from '#/types/inventory.ts';
  import type { ItemId } from '#/types/item-id.ts';
  import { ItemScene as Scene, type ItemScene, type ItemTarget, type ItemUseFailure } from '#/types/item-usage.ts';
  import type { Party } from '#/types/pokemon.ts';
  import { getAsset } from '#/utils/get-asset.ts';

  type Props = {
    inventory: Inventory;
    /** Pokémon an item can be used on. */
    party?: Party;
    /** Which effects decide whether an item is usable. Without `onUse` items can only be looked at. */
    scene?: ItemScene;
    onUse?: (id: ItemId, target: ItemTarget) => { ok: true; messages: string[] } | ItemUseFailure;
    open?: boolean;
  };

  let { inventory, party = [], scene = Scene.Overworld, onUse, open = $bindable(false) }: Props = $props();

  let dialog = $state<HTMLDialogElement>();
  // Item waiting for its target, and the Pokémon picked so far when it also needs a move.
  let picking = $state<{ id: ItemId; name: string; kind: TargetKind } | null>(null);
  let pickedPokemon = $state<number | null>(null);
  let message = $state('');

  const items = $derived(inventory.map(item => {
    const data = getItemData(item.id);
    const effect = getItemEffects(item.id)?.[scene];
    return {
      id: item.id,
      amount: item.amount,
      name: data?.name ?? item.id,
      sprite: data?.sprite,
      description: data?.description,
      targetKind: effect ? targetKindOf(effect) : null,
    };
  }));

  function use(id: ItemId, target: ItemTarget) {
    const result = onUse?.(id, target);
    if (!result) return;
    message = result.ok ? result.messages.join(' ') : (result.message ?? "It won't have any effect.");
    picking = null;
    pickedPokemon = null;
  }

  function select(item: (typeof items)[number]) {
    if (!onUse || !item.targetKind) return;
    message = '';
    if (item.targetKind === 'none') use(item.id, { kind: 'none' });
    else picking = { id: item.id, name: item.name, kind: item.targetKind };
  }

  function pickPokemon(index: number) {
    if (!picking) return;
    if (picking.kind === 'move') pickedPokemon = index;
    else use(picking.id, { kind: 'party', index });
  }

  function cancel() {
    picking = null;
    pickedPokemon = null;
  }

  $effect(() => {
    if (!dialog) return;

    if (open && !dialog.open) dialog.showModal();
    else if (!open && dialog.open) dialog.close();
  });

  $effect(() => {
    if (!open) {
      cancel();
      message = '';
    }
  });
</script>

<dialog
  bind:this={dialog}
  oncancel={() => (open = false)}
  onclose={() => (open = false)}
>
  <h2>Inventory</h2>

  {#if message}<p class="message" role="status">{message}</p>{/if}

  {#if picking}
    <h3>Use {picking.name} on</h3>
    <ul class="targets">
      {#if pickedPokemon === null}
        {#each party as pokemon, i}
          <li>
            <button onclick={() => pickPokemon(i)}>
              {pokemon.name || pokemon.species} Lv. {pokemon.level} — {pokemon.hp ?? partyMaxHp(pokemon)}/{partyMaxHp(pokemon)} HP{pokemon.status ? ` (${pokemon.status})` : ''}
            </button>
          </li>
        {/each}
      {:else}
        {#each party[pickedPokemon].moves as move, m}
          <li>
            <button onclick={() => use(picking!.id, { kind: 'party', index: pickedPokemon!, moveIndex: m })}>
              {move}
            </button>
          </li>
        {/each}
      {/if}
    </ul>
    <button onclick={cancel}>Back</button>
  {:else if items.length}
    <ul class="inventory-grid">
      {#each items as item (item.id)}
        <li>
          <button
            class="inventory-item"
            title={item.description || item.name}
            disabled={!onUse || !item.targetKind}
            onclick={() => select(item)}
          >
            <div class="icon">
              {#if item.sprite}
                <img src={getAsset(item.sprite)} alt="" />
              {/if}
              <span class="amount">×{item.amount}</span>
            </div>
            <span class="name">{item.name}</span>
          </button>
        </li>
      {/each}
    </ul>
  {:else}
    <p class="empty">Your inventory is empty.</p>
  {/if}

  <form method="dialog"><button>Close</button></form>
</dialog>

<style>
  dialog[open] {
    display: flex;
    flex-direction: column;
  }

  dialog {
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

  .inventory-grid li { display: flex; }

  .targets {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    margin: 0 0 1rem;
    padding: 0;
    list-style: none;
    overflow-y: auto;
  }

  .targets button { width: 100%; text-align: left; }

  .message { margin: 0 0 0.5rem; font-weight: bold; }

  .inventory-item {
    flex: 1;
    background: none;
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
