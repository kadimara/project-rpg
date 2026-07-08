import { TILE } from '../systems/world.ts';
import type { Direction } from '../types/world.ts';
import type { Player } from '../types/entities.ts';
import type { WalkableFn } from '../systems/pathfinding.ts';
import { startStep } from './actor.ts';

export const PLAYER_BASE_MAXHP = 10;
export const PLAYER_BASE_ATK = 1;
export const PLAYER_BASE_ATK_COOLDOWN = 650;

export function createPlayer(spawnX: number, spawnY: number): Player {
  return {
    tileX: spawnX,
    tileY: spawnY,
    px: spawnX * TILE,
    py: spawnY * TILE,
    dir: 'down',
    moving: false,
    moveStart: 0,
    moveDur: 260,
    fromX: 0,
    fromY: 0,
    toX: 0,
    toY: 0,
    path: [],
    hp: PLAYER_BASE_MAXHP,
    maxHp: PLAYER_BASE_MAXHP,
    atkDamage: PLAYER_BASE_ATK,
    atkCooldown: PLAYER_BASE_ATK_COOLDOWN,
    lastAttack: 0,
    attackTarget: null,
    pickupTarget: null,
    talkTarget: null,
    flashUntil: 0,
    hpBarUntil: 0,
  };
}

export function tryMove(player: Player, dir: Direction, walkable: WalkableFn, now: number): void {
  let dx = 0;
  let dy = 0;
  if (dir === 'up') dy = -1;
  else if (dir === 'down') dy = 1;
  else if (dir === 'left') dx = -1;
  else if (dir === 'right') dx = 1;
  const nx = player.tileX + dx;
  const ny = player.tileY + dy;
  if (!walkable(nx, ny)) return;
  startStep(player, nx, ny, dir, now);
}
