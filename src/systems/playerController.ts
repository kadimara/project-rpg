import type { Direction } from '../types/world.ts';
import type { ActorBase, Enemy, Player, Footprint } from '../types/entities.ts';
import type { Npc } from '../types/npc.ts';
import { startStep, updateActorAnimation } from '../entities/actor.ts';
import { tryMove } from '../entities/player.ts';
import { actorFootprint, tileAdjacentToFootprint } from '../entities/footprint.ts';
import { bfsChase, dirBetween } from './pathfinding.ts';
import type { WalkableFn } from './pathfinding.ts';

export interface PlayerControllerDeps {
  enemies: Enemy[];
  heldDir: () => Direction | null;
  walkable: WalkableFn;
  isPlayerRanged: () => boolean;
  getPlayerRange: () => number;
  attemptAttack: (attacker: ActorBase, defender: Enemy, now: number) => void;
  attemptRangedAttack: (attacker: ActorBase, defender: Enemy, now: number) => void;
  updateHud: () => void;
  tryPickupGroundItems: (x: number, y: number) => void;
  npcAt: (x: number, y: number) => Npc | undefined;
  interactWithNpc: (npc: Npc) => void;
}

export function updatePlayer(player: Player, now: number, deps: PlayerControllerDeps): void {
  if (player.moving) {
    updateActorAnimation(player, now);
    if (!player.moving) {
      deps.updateHud();
      if (player.pickupTarget && player.pickupTarget.x === player.tileX && player.pickupTarget.y === player.tileY) {
        deps.tryPickupGroundItems(player.tileX, player.tileY);
        player.pickupTarget = null;
      }
    }
    return;
  }

  const dir = deps.heldDir();
  if (dir) {
    player.path = [];
    player.attackTarget = null;
    player.pickupTarget = null;
    tryMove(player, dir, deps.walkable, now);
    return;
  }

  if (player.attackTarget && deps.enemies.includes(player.attackTarget) && player.attackTarget.hp > 0) {
    player.pickupTarget = null;
    const t = player.attackTarget;
    const footprint = actorFootprint(t);
    const ranged = deps.isPlayerRanged();
    const range = deps.getPlayerRange();
    let nearest: { x: number; y: number; d: number } | null = null;
    for (const tile of footprint) {
      const d = Math.abs(player.tileX - tile.x) + Math.abs(player.tileY - tile.y);
      if (!nearest || d < nearest.d) nearest = { x: tile.x, y: tile.y, d };
    }
    const inRange = !!nearest && (ranged ? nearest.d <= range : nearest.d === 1);
    if (inRange && nearest) {
      player.path = [];
      player.dir = dirBetween(player.tileX, player.tileY, nearest.x, nearest.y);
      if (ranged) deps.attemptRangedAttack(player, t, now);
      else deps.attemptAttack(player, t, now);
      deps.updateHud();
    } else {
      if (player.path.length === 0) {
        const isGoal = ranged
          ? (x: number, y: number) => footprint.some((tile) => Math.abs(x - tile.x) + Math.abs(y - tile.y) <= range)
          : (x: number, y: number) => tileAdjacentToFootprint(x, y, footprint);
        player.path = bfsChase(deps.walkable, player.tileX, player.tileY, isGoal);
      }
      if (player.path.length) {
        const next = player.path.shift()!;
        if (deps.walkable(next.x, next.y)) {
          startStep(player, next.x, next.y, dirBetween(player.tileX, player.tileY, next.x, next.y), now);
        } else {
          player.path = [];
        }
      }
    }
    return;
  }

  if (player.talkTarget) {
    player.pickupTarget = null;
    const npcFootprint: Footprint = [{ x: player.talkTarget.x, y: player.talkTarget.y }];
    if (tileAdjacentToFootprint(player.tileX, player.tileY, npcFootprint)) {
      player.path = [];
      const target = deps.npcAt(player.talkTarget.x, player.talkTarget.y);
      player.talkTarget = null;
      if (target) deps.interactWithNpc(target);
    } else {
      if (player.path.length === 0) {
        player.path = bfsChase(deps.walkable, player.tileX, player.tileY, (x, y) => tileAdjacentToFootprint(x, y, npcFootprint));
      }
      if (player.path.length) {
        const next = player.path.shift()!;
        if (deps.walkable(next.x, next.y)) {
          startStep(player, next.x, next.y, dirBetween(player.tileX, player.tileY, next.x, next.y), now);
        } else {
          player.path = [];
        }
      }
    }
    return;
  }

  if (player.path.length) {
    const next = player.path.shift()!;
    if (deps.walkable(next.x, next.y)) {
      startStep(player, next.x, next.y, dirBetween(player.tileX, player.tileY, next.x, next.y), now);
    } else {
      player.path = [];
    }
  }
}
