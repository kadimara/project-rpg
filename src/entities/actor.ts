import { TILE } from '../systems/world.ts';
import type { Position, Movement } from '../types/entities.ts';
import type { Direction } from '../types/world.ts';

export interface Mover {
  position: Position;
  movement: Movement;
}

export function startStep(
  actor: Mover,
  nx: number,
  ny: number,
  dir: Direction,
  now: number,
): void {
  actor.movement.dir = dir;
  actor.movement.fromX = actor.position.tileX;
  actor.movement.fromY = actor.position.tileY;
  actor.movement.toX = nx;
  actor.movement.toY = ny;
  actor.position.tileX = nx;
  actor.position.tileY = ny;
  actor.movement.moving = true;
  actor.movement.moveStart = now;
}

export function updateActorAnimation(actor: Mover, now: number): void {
  if (!actor.movement.moving) return;
  const t = Math.min(
    1,
    (now - actor.movement.moveStart) / actor.movement.moveDur,
  );
  actor.position.px =
    (actor.movement.fromX + (actor.movement.toX - actor.movement.fromX) * t) *
    TILE;
  actor.position.py =
    (actor.movement.fromY + (actor.movement.toY - actor.movement.fromY) * t) *
    TILE;
  if (t >= 1) {
    actor.movement.moving = false;
    actor.position.px = actor.movement.toX * TILE;
    actor.position.py = actor.movement.toY * TILE;
  }
}
