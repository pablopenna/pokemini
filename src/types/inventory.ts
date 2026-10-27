import { ItemId } from "./item-data";

export type Inventory = InventoryItem[];
export type InventoryItem = {
    id: ItemId,
    amount: number
}