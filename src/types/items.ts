export type ActionLabel = 'A' | 'B' | 'X' | 'Y';

export interface MeleeItem {
  kind: 'melee';
  name: string;
}

export interface BombItem {
  kind: 'bomb';
  name: string;
  damage: number;
  radius: number;
  fuseTime: number;
  cooldown: number;
  lastUsed: number;
}

export interface PotionItem {
  kind: 'potion';
  name: string;
  healAmount: number;
  cooldown: number;
  charges: number;
  maxCharges: number;
  lastUsed: number;
}

export type Item = MeleeItem | BombItem | PotionItem;
export type ActionSlot = Item | null;
export type ActionSlots = [ActionSlot, ActionSlot, ActionSlot, ActionSlot];
