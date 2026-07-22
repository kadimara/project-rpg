import type { ActionSlots } from '../types/items.ts';

// the fixed starting loadout - slots are index-ordered A/B/X/Y, matching
// src/input/actionKeys.ts's ACTION_KEY_BINDINGS
export function createDefaultActionSlots(): ActionSlots {
  return [
    { kind: 'melee', name: 'Sword' },
    {
      kind: 'bomb',
      name: 'Bomb',
      damage: 3,
      radius: 1,
      fuseTime: 600,
      cooldown: 1800,
      lastUsed: 0,
    },
    {
      kind: 'potion',
      name: 'Potion',
      healAmount: 5,
      cooldown: 400,
      charges: 3,
      maxCharges: 3,
      lastUsed: 0,
    },
    {
      kind: 'potion',
      name: 'Elixir',
      healAmount: 10,
      cooldown: 500,
      charges: 1,
      maxCharges: 1,
      lastUsed: 0,
    },
  ];
}
