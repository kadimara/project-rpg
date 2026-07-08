import type { Direction } from '../types/world.ts';
import type { Combatant, Enemy, Player } from '../types/entities.ts';
import { startStep, updateActorAnimation } from '../entities/actor.ts';
import { tryMove } from '../entities/player.ts';
import { actorFootprint, tileAdjacentToFootprint } from '../entities/footprint.ts';
import { bfsChase, dirBetween } from './pathfinding.ts';
import type { WalkableFn } from './pathfinding.ts';

export interface PlayerControllerDeps {
  enemies: Enemy[];
  heldDir: () => Direction | null;
  walkable: WalkableFn;
  attemptAttack: (attacker: Combatant, defender: Enemy, now: number) => void;
  updateHud: () => void;
}

export function updatePlayer(player: Player, now: number, deps: PlayerControllerDeps): void {
  if (player.movement.moving) {
    updateActorAnimation(player, now);
    if (!player.movement.moving) {
      deps.updateHud();
    }
    return;
  }

  const dir = deps.heldDir();
  if (dir) {
    player.movement.path = [];
    player.attackTarget = null;
    tryMove(player, dir, deps.walkable, now);
    return;
  }

  if (player.attackTarget && deps.enemies.includes(player.attackTarget) && player.attackTarget.health.hp > 0) {
    const t = player.attackTarget;
    const footprint = actorFootprint(t);
    let nearest: { x: number; y: number; d: number } | null = null;
    for (const tile of footprint) {
      const d = Math.abs(player.position.tileX - tile.x) + Math.abs(player.position.tileY - tile.y);
      if (!nearest || d < nearest.d) nearest = { x: tile.x, y: tile.y, d };
    }
    const inRange = !!nearest && nearest.d === 1;
    if (inRange && nearest) {
      player.movement.path = [];
      player.movement.dir = dirBetween(player.position.tileX, player.position.tileY, nearest.x, nearest.y);
      deps.attemptAttack(player, t, now);
      deps.updateHud();
    } else {
      if (player.movement.path.length === 0) {
        player.movement.path = bfsChase(deps.walkable, player.position.tileX, player.position.tileY, (x, y) => tileAdjacentToFootprint(x, y, footprint));
      }
      if (player.movement.path.length) {
        const next = player.movement.path.shift()!;
        if (deps.walkable(next.x, next.y)) {
          startStep(player, next.x, next.y, dirBetween(player.position.tileX, player.position.tileY, next.x, next.y), now);
        } else {
          player.movement.path = [];
        }
      }
    }
    return;
  }

  if (player.movement.path.length) {
    const next = player.movement.path.shift()!;
    if (deps.walkable(next.x, next.y)) {
      startStep(player, next.x, next.y, dirBetween(player.position.tileX, player.position.tileY, next.x, next.y), now);
    } else {
      player.movement.path = [];
    }
  }
}
