import type { Direction } from '../types/world.ts';
import { ACTION_KEY_BINDINGS, ACTION_KEYS } from './actionKeys.ts';

const MOVE_KEYS = [
  'ArrowUp',
  'ArrowDown',
  'ArrowLeft',
  'ArrowRight',
  'w',
  'a',
  's',
  'd',
  'W',
  'A',
  'S',
  'D',
];

export interface KeyboardState {
  heldDir(): Direction | null;
  heldActionSlot(i: number): boolean;
}

// note: the original clears the player's active path/targets on *every* keydown,
// not just movement keys - preserved here via the unconditional onKeyDown callback,
// except for the action-slot keys, which must not cancel an in-progress path/target
export function createKeyboardState(onKeyDown: () => void): KeyboardState {
  const keys: Record<string, boolean> = {};

  window.addEventListener('keydown', (e) => {
    if (MOVE_KEYS.includes(e.key)) e.preventDefault();
    const key = e.key.toLowerCase();
    keys[key] = true;
    if (!ACTION_KEYS.includes(key)) onKeyDown();
  });
  window.addEventListener('keyup', (e) => {
    keys[e.key.toLowerCase()] = false;
  });

  function heldDir(): Direction | null {
    if (keys['arrowup'] || keys['w']) return 'up';
    if (keys['arrowdown'] || keys['s']) return 'down';
    if (keys['arrowleft'] || keys['a']) return 'left';
    if (keys['arrowright'] || keys['d']) return 'right';
    return null;
  }

  function heldActionSlot(i: number): boolean {
    return !!keys[ACTION_KEY_BINDINGS[i].key];
  }

  return { heldDir, heldActionSlot };
}
