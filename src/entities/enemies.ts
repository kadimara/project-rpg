import { TILE } from '../systems/world.ts';
import type { Enemy } from '../types/entities.ts';
import { actorFootprint } from './footprint.ts';

const ENEMY_SPAWNS: Array<[number, number]> = [[12, 5], [17, 13], [6, 6]];

export function createEnemies(): Enemy[] {
  return ENEMY_SPAWNS.map(([tileX, tileY]) => ({
    tileX,
    tileY,
    dir: 'down',
    size: 1,
    px: tileX * TILE,
    py: tileY * TILE,
    moving: false,
    moveStart: 0,
    moveDur: 420,
    fromX: 0,
    fromY: 0,
    toX: 0,
    toY: 0,
    path: [],
    hp: 10,
    maxHp: 10,
    atkDamage: 1,
    atkCooldown: 900,
    lastAttack: 0,
    aggro: false,
    flashUntil: 0,
    hpBarUntil: 0,
  }));
}

export function createBoss(): Enemy {
  return {
    tileX: 11,
    tileY: 9,
    dir: 'down',
    isBoss: true,
    size: 2,
    px: 11 * TILE,
    py: 9 * TILE,
    moving: false,
    moveStart: 0,
    moveDur: 620,
    fromX: 0,
    fromY: 0,
    toX: 0,
    toY: 0,
    path: [],
    hp: 40,
    maxHp: 40,
    atkDamage: 2,
    atkCooldown: 1100,
    lastAttack: 0,
    specialCooldown: 3400,
    lastSpecial: 0,
    telegraphDuration: 900,
    specialDamage: 3,
    aggro: false,
    flashUntil: 0,
    hpBarUntil: 0,
  };
}

export function enemyAt(enemies: Enemy[], x: number, y: number): boolean {
  return enemies.some((e) => actorFootprint(e).some((t) => t.x === x && t.y === y));
}

export function enemyAtTile(enemies: Enemy[], x: number, y: number): Enemy | undefined {
  return enemies.find((e) => actorFootprint(e).some((t) => t.x === x && t.y === y));
}
