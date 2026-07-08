import { TILE } from '../systems/world.ts';
import type { ActorBase } from '../types/entities.ts';
import type { Direction } from '../types/world.ts';

export function startStep(actor: ActorBase, nx: number, ny: number, dir: Direction, now: number): void {
  actor.dir = dir;
  actor.fromX = actor.tileX;
  actor.fromY = actor.tileY;
  actor.toX = nx;
  actor.toY = ny;
  actor.tileX = nx;
  actor.tileY = ny;
  actor.moving = true;
  actor.moveStart = now;
}

export function updateActorAnimation(actor: ActorBase, now: number): void {
  if (!actor.moving) return;
  const t = Math.min(1, (now - actor.moveStart) / actor.moveDur);
  actor.px = (actor.fromX + (actor.toX - actor.fromX) * t) * TILE;
  actor.py = (actor.fromY + (actor.toY - actor.fromY) * t) * TILE;
  if (t >= 1) {
    actor.moving = false;
    actor.px = actor.toX * TILE;
    actor.py = actor.toY * TILE;
  }
}
