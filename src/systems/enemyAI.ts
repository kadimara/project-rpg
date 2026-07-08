import { TILE, MAP_W, MAP_H } from './world.ts';
import type { Enemy, Player, ActorBase } from '../types/entities.ts';
import type { CombatState } from '../types/combat.ts';
import { startStep, updateActorAnimation } from '../entities/actor.ts';
import { actorFootprint, footprintAt, tileAdjacentToFootprint } from '../entities/footprint.ts';
import { bfsChase, dirBetween, tileDist } from './pathfinding.ts';

const AGGRO_LEASH_RADIUS = 6; // tiles - enemies give up the chase past this range

export interface EnemyAIDeps {
  enemyChaseWalkable: (x: number, y: number, self: Enemy) => boolean;
  bossFootprintWalkable: (x: number, y: number, self: Enemy) => boolean;
  attemptAttack: (attacker: ActorBase, defender: Player, now: number) => void;
  updateHud: () => void;
}

export function updateEnemies(enemies: Enemy[], player: Player, state: CombatState, now: number, deps: EnemyAIDeps): void {
  for (const en of enemies) {
    if (en.isBoss && en.aggro && en.specialCooldown !== undefined && now - (en.lastSpecial ?? 0) >= en.specialCooldown) {
      en.lastSpecial = now;
      const impactTime = now + (en.telegraphDuration ?? 0);
      const launchX = en.px + TILE;
      const launchY = en.py + TILE;

      state.telegraphs.push({
        x: player.tileX,
        y: player.tileY,
        fromX: launchX,
        fromY: launchY,
        bornTime: now,
        impactTime,
        dmg: en.specialDamage ?? 0,
      });

      const offsets = [[1, 0], [-1, 0], [0, 1], [0, -1]];
      const off = offsets[Math.floor(Math.random() * offsets.length)];
      const nearX = Math.max(1, Math.min(MAP_W - 2, player.tileX + off[0]));
      const nearY = Math.max(1, Math.min(MAP_H - 2, player.tileY + off[1]));
      state.telegraphs.push({
        x: nearX,
        y: nearY,
        fromX: launchX,
        fromY: launchY,
        bornTime: now,
        impactTime,
        dmg: en.specialDamage ?? 0,
      });
    }

    if (en.moving) {
      updateActorAnimation(en, now);
      continue;
    }
    if (!en.aggro) continue;
    if (tileDist(en.tileX, en.tileY, player.tileX, player.tileY) > AGGRO_LEASH_RADIUS) {
      en.aggro = false;
      en.path = [];
      continue;
    }
    const footprint = actorFootprint(en);
    if (tileAdjacentToFootprint(player.tileX, player.tileY, footprint)) {
      en.path = [];
      en.dir = dirBetween(en.tileX, en.tileY, player.tileX, player.tileY);
      if (!en.isBoss) {
        deps.attemptAttack(en, player, now);
        deps.updateHud();
      }
    } else {
      const stepWalkable = en.isBoss
        ? (x: number, y: number) => deps.bossFootprintWalkable(x, y, en)
        : (x: number, y: number) => deps.enemyChaseWalkable(x, y, en);
      const isGoal = en.isBoss
        ? (x: number, y: number) => tileAdjacentToFootprint(player.tileX, player.tileY, footprintAt(x, y, 2))
        : (x: number, y: number) => tileAdjacentToFootprint(x, y, [{ x: player.tileX, y: player.tileY }]);
      if (en.path.length === 0) {
        en.path = bfsChase(stepWalkable, en.tileX, en.tileY, isGoal);
      }
      if (en.path.length) {
        const next = en.path.shift()!;
        if (stepWalkable(next.x, next.y)) {
          startStep(en, next.x, next.y, dirBetween(en.tileX, en.tileY, next.x, next.y), now);
        } else {
          en.path = [];
        }
      }
    }
  }
}

export function resolveTelegraphs(state: CombatState, player: Player, now: number, dealDamageToPlayer: (dmg: number, now: number) => void): void {
  for (let i = state.telegraphs.length - 1; i >= 0; i--) {
    const tg = state.telegraphs[i];
    if (now >= tg.impactTime) {
      if (tg.x === player.tileX && tg.y === player.tileY) {
        dealDamageToPlayer(tg.dmg, now);
      }
      state.telegraphs.splice(i, 1);
    }
  }
}

export function resolveProjectiles(
  state: CombatState,
  enemies: Enemy[],
  player: Player,
  now: number,
  applyDamage: (attacker: ActorBase, defender: Enemy, dmg: number, now: number) => void,
  updateHud: () => void,
): void {
  for (let i = state.playerProjectiles.length - 1; i >= 0; i--) {
    const p = state.playerProjectiles[i];
    if (now >= p.arriveTime) {
      if (enemies.includes(p.target) && p.target.hp > 0) {
        applyDamage(player, p.target, p.dmg, now);
        updateHud();
      }
      state.playerProjectiles.splice(i, 1);
    }
  }
}
