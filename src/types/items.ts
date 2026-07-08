export type ItemId =
  | 'potion_minor'
  | 'potion_greater'
  | 'sword_iron'
  | 'bow_wood'
  | 'armor_hide'
  | 'warden_blade'
  | 'warden_plate';

export type ItemType = 'consumable' | 'weapon' | 'armor';

export interface ItemDef {
  name: string;
  type: ItemType;
  value: number;
  color: string;
  edge: string;
  stackable: boolean;
  maxStack?: number;
  heal?: number;
  atkBonus?: number;
  ranged?: boolean;
  range?: number;
  atkCooldown?: number;
  hpBonus?: number;
}

export const ITEM_DEFS: Record<ItemId, ItemDef> = {
  potion_minor: { name: 'Minor potion', type: 'consumable', heal: 4, value: 4, color: '#5ec46b', edge: '#357a3f', stackable: true, maxStack: 5 },
  potion_greater: { name: 'Greater potion', type: 'consumable', heal: 8, value: 8, color: '#2f9e46', edge: '#1d5e2a', stackable: true, maxStack: 5 },
  sword_iron: { name: 'Iron sword', type: 'weapon', atkBonus: 1, value: 10, color: '#b8bcc4', edge: '#787c84', stackable: false },
  bow_wood: { name: 'Wooden bow', type: 'weapon', atkBonus: 1, ranged: true, range: 5, atkCooldown: 850, value: 14, color: '#a8794f', edge: '#4a3220', stackable: false },
  armor_hide: { name: 'Hide armor', type: 'armor', hpBonus: 5, value: 10, color: '#8a6a3f', edge: '#5c4527', stackable: false },
  warden_blade: { name: "Warden's blade", type: 'weapon', atkBonus: 3, value: 40, color: '#e0b23f', edge: '#8a6b1f', stackable: false },
  warden_plate: { name: "Warden's plate", type: 'armor', hpBonus: 10, value: 40, color: '#7d82c4', edge: '#4a4e80', stackable: false },
};

export interface InventorySlotFilled {
  itemId: ItemId;
  qty: number;
}
export type InventorySlot = InventorySlotFilled | null;

export interface GroundItem {
  x: number;
  y: number;
  itemId: ItemId;
  qty: number;
}

export interface Equipment {
  weapon: ItemId | null;
  armor: ItemId | null;
}
