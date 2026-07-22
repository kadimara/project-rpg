import { TILE } from '../systems/world.ts';
import type { Enemy } from '../types/entities.ts';
import { actorFootprint } from './footprint.ts';

const ENEMY_SPAWNS: Array<[number, number]> = [
  [2, 1],
  [5, 1],
  [7, 4],
];

export function createEnemies(): Enemy[] {
  return ENEMY_SPAWNS.map(([tileX, tileY]) => ({
    id: crypto.randomUUID(),
    kind: 'enemy',
    position: { tileX, tileY, px: tileX * TILE, py: tileY * TILE },
    movement: {
      dir: 'down',
      moving: false,
      moveStart: 0,
      moveDur: 480,
      fromX: 0,
      fromY: 0,
      toX: 0,
      toY: 0,
      path: [],
    },
    health: { hp: 10, maxHp: 10, flashUntil: 0, hpBarUntil: 0 },
    combat: { atkDamage: 1, atkCooldown: 1000, lastAttack: 0 },
    size: 1,
    aggro: false,
  }));
}

export function createBoss(): Enemy {
  return {
    id: crypto.randomUUID(),
    kind: 'enemy',
    position: { tileX: 3, tileY: 3, px: 3 * TILE, py: 3 * TILE },
    movement: {
      dir: 'down',
      moving: false,
      moveStart: 0,
      moveDur: 700,
      fromX: 0,
      fromY: 0,
      toX: 0,
      toY: 0,
      path: [],
    },
    health: { hp: 40, maxHp: 40, flashUntil: 0, hpBarUntil: 0 },
    combat: { atkDamage: 2, atkCooldown: 1200, lastAttack: 0 },
    isBoss: true,
    size: 2,
    specialCooldown: 3800,
    lastSpecial: 0,
    telegraphDuration: 1000,
    specialDamage: 3,
    aggro: false,
  };
}

export function enemyAt(enemies: Enemy[], x: number, y: number): boolean {
  return enemies.some((e) =>
    actorFootprint(e).some((t) => t.x === x && t.y === y),
  );
}

export function enemyAtTile(
  enemies: Enemy[],
  x: number,
  y: number,
): Enemy | undefined {
  return enemies.find((e) =>
    actorFootprint(e).some((t) => t.x === x && t.y === y),
  );
}
