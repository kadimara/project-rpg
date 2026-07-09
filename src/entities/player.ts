import { SPAWN_X, SPAWN_Y, TILE } from '../systems/world.ts';
import type { Direction } from '../types/world.ts';
import type { Player } from '../types/entities.ts';
import type { CombatState } from '../types/combat.ts';
import type { WalkableFn } from '../systems/pathfinding.ts';
import { startStep } from './actor.ts';
import { getEnemies, getPlayer, type EntityStore } from './store.ts';

export const PLAYER_BASE_MAXHP = 10;
export const PLAYER_BASE_ATK = 1;
export const PLAYER_BASE_ATK_COOLDOWN = 650;

export function createPlayer(spawnX: number, spawnY: number): Player {
  return {
    id: crypto.randomUUID(),
    kind: 'player',
    position: {
      tileX: spawnX,
      tileY: spawnY,
      px: spawnX * TILE,
      py: spawnY * TILE,
    },
    movement: {
      dir: 'down',
      moving: false,
      moveStart: 0,
      moveDur: 260,
      fromX: 0,
      fromY: 0,
      toX: 0,
      toY: 0,
      path: [],
    },
    health: {
      hp: PLAYER_BASE_MAXHP,
      maxHp: PLAYER_BASE_MAXHP,
      flashUntil: 0,
      hpBarUntil: 0,
    },
    combat: {
      atkDamage: PLAYER_BASE_ATK,
      atkCooldown: PLAYER_BASE_ATK_COOLDOWN,
      lastAttack: 0,
    },
    attackTarget: null,
  };
}

export function tryMove(
  player: Player,
  dir: Direction,
  walkable: WalkableFn,
  now: number,
): void {
  let dx = 0;
  let dy = 0;
  if (dir === 'up') dy = -1;
  else if (dir === 'down') dy = 1;
  else if (dir === 'left') dx = -1;
  else if (dir === 'right') dx = 1;
  const nx = player.position.tileX + dx;
  const ny = player.position.tileY + dy;
  if (!walkable(nx, ny)) return;
  startStep(player, nx, ny, dir, now);
}

// Resets the player to the spawn point after death and clears enemy aggro.
export function respawnPlayer(
  store: EntityStore,
  state: CombatState,
  now: number,
): void {
  const player = getPlayer(store);
  player.health.hp = player.health.maxHp;
  player.position.tileX = SPAWN_X;
  player.position.tileY = SPAWN_Y;
  player.position.px = SPAWN_X * TILE;
  player.position.py = SPAWN_Y * TILE;
  player.movement.path = [];
  player.attackTarget = null;
  player.movement.moving = false;
  getEnemies(store).forEach((e) => {
    e.aggro = false;
    e.movement.path = [];
  });
  state.respawnMessageUntil = now + 1400;
}
