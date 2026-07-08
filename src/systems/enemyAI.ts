import { TILE, MAP_W, MAP_H } from './world.ts';
import type { Combatant, Enemy, Player } from '../types/entities.ts';
import type { CombatState } from '../types/combat.ts';
import { startStep, updateActorAnimation } from '../entities/actor.ts';
import { actorFootprint, footprintAt, tileAdjacentToFootprint } from '../entities/footprint.ts';
import { bfsChase, dirBetween, tileDist } from './pathfinding.ts';

const AGGRO_LEASH_RADIUS = 6; // tiles - enemies give up the chase past this range

export interface EnemyAIDeps {
  enemyChaseWalkable: (x: number, y: number, self: Enemy) => boolean;
  bossFootprintWalkable: (x: number, y: number, self: Enemy) => boolean;
  attemptAttack: (attacker: Combatant, defender: Player, now: number) => void;
  updateHud: () => void;
}

export function updateEnemies(enemies: Enemy[], player: Player, state: CombatState, now: number, deps: EnemyAIDeps): void {
  for (const en of enemies) {
    if (en.isBoss && en.aggro && en.specialCooldown !== undefined && now - (en.lastSpecial ?? 0) >= en.specialCooldown) {
      en.lastSpecial = now;
      const impactTime = now + (en.telegraphDuration ?? 0);
      const launchX = en.position.px + TILE;
      const launchY = en.position.py + TILE;

      state.telegraphs.push({
        x: player.position.tileX,
        y: player.position.tileY,
        fromX: launchX,
        fromY: launchY,
        bornTime: now,
        impactTime,
        dmg: en.specialDamage ?? 0,
      });

      const offsets = [[1, 0], [-1, 0], [0, 1], [0, -1]];
      const off = offsets[Math.floor(Math.random() * offsets.length)];
      const nearX = Math.max(1, Math.min(MAP_W - 2, player.position.tileX + off[0]));
      const nearY = Math.max(1, Math.min(MAP_H - 2, player.position.tileY + off[1]));
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

    if (en.movement.moving) {
      updateActorAnimation(en, now);
      continue;
    }
    if (!en.aggro) continue;
    if (tileDist(en.position.tileX, en.position.tileY, player.position.tileX, player.position.tileY) > AGGRO_LEASH_RADIUS) {
      en.aggro = false;
      en.movement.path = [];
      continue;
    }
    const footprint = actorFootprint(en);
    if (tileAdjacentToFootprint(player.position.tileX, player.position.tileY, footprint)) {
      en.movement.path = [];
      en.movement.dir = dirBetween(en.position.tileX, en.position.tileY, player.position.tileX, player.position.tileY);
      if (!en.isBoss) {
        deps.attemptAttack(en, player, now);
        deps.updateHud();
      }
    } else {
      const stepWalkable = en.isBoss
        ? (x: number, y: number) => deps.bossFootprintWalkable(x, y, en)
        : (x: number, y: number) => deps.enemyChaseWalkable(x, y, en);
      const isGoal = en.isBoss
        ? (x: number, y: number) => tileAdjacentToFootprint(player.position.tileX, player.position.tileY, footprintAt(x, y, 2))
        : (x: number, y: number) => tileAdjacentToFootprint(x, y, [{ x: player.position.tileX, y: player.position.tileY }]);
      if (en.movement.path.length === 0) {
        en.movement.path = bfsChase(stepWalkable, en.position.tileX, en.position.tileY, isGoal);
      }
      if (en.movement.path.length) {
        const next = en.movement.path.shift()!;
        if (stepWalkable(next.x, next.y)) {
          startStep(en, next.x, next.y, dirBetween(en.position.tileX, en.position.tileY, next.x, next.y), now);
        } else {
          en.movement.path = [];
        }
      }
    }
  }
}

export function resolveTelegraphs(state: CombatState, player: Player, now: number, dealDamageToPlayer: (dmg: number, now: number) => void): void {
  for (let i = state.telegraphs.length - 1; i >= 0; i--) {
    const tg = state.telegraphs[i];
    if (now >= tg.impactTime) {
      if (tg.x === player.position.tileX && tg.y === player.position.tileY) {
        dealDamageToPlayer(tg.dmg, now);
      }
      state.telegraphs.splice(i, 1);
    }
  }
}

