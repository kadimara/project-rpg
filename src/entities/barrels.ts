import { TILE } from '../systems/world.ts';
import type { Barrel } from '../types/entities.ts';

const BARREL_SPAWNS: Array<[number, number]> = [[8, 5], [14, 9], [19, 15]];

export function createBarrels(): Barrel[] {
  return BARREL_SPAWNS.map(([tileX, tileY]) => ({
    position: { tileX, tileY, px: tileX * TILE, py: tileY * TILE },
    health: { hp: 3, maxHp: 3, flashUntil: 0, hpBarUntil: 0 },
    size: 1,
  }));
}

export function barrelAt(barrels: Barrel[], x: number, y: number): boolean {
  return barrels.some((b) => b.position.tileX === x && b.position.tileY === y);
}

export function barrelAtTile(barrels: Barrel[], x: number, y: number): Barrel | undefined {
  return barrels.find((b) => b.position.tileX === x && b.position.tileY === y);
}
