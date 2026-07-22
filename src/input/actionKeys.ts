import type { ActionLabel } from '../types/items.ts';

export interface ActionKeyBinding {
  label: ActionLabel;
  key: string;
}

// IJKL sits directly right of WASD, forming the same diamond as a gamepad's
// face buttons: I (top) = Y, J (left) = X, L (right) = B, K (bottom) = A
export const ACTION_KEY_BINDINGS: ActionKeyBinding[] = [
  { label: 'A', key: 'k' },
  { label: 'B', key: 'l' },
  { label: 'X', key: 'j' },
  { label: 'Y', key: 'i' },
];

export const ACTION_KEYS = ACTION_KEY_BINDINGS.map((b) => b.key);
