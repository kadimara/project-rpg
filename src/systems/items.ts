import { MAP_W, MAP_H, TILE } from './world.ts';
import { tileDist } from './pathfinding.ts';
import {
  applyDamage,
  attemptAttack,
  spawnFloatingText,
  type CombatContext,
} from './combat.ts';
import type { Barrel, Defender, Enemy, Player } from '../types/entities.ts';
import type { CombatState } from '../types/combat.ts';
import type { BombItem, PotionItem } from '../types/items.ts';
import {
  actorFootprint,
  tileAdjacentToFootprint,
} from '../entities/footprint.ts';
import { getBarrels, getEnemies, type EntityStore } from '../entities/store.ts';

export interface ItemContext {
  combatCtx: CombatContext;
  store: EntityStore;
  updateHud: () => void;
}

export function useSlot(
  ctx: ItemContext,
  player: Player,
  slotIndex: number,
  now: number,
): void {
  const item = player.actionSlots[slotIndex];
  if (!item) return;

  if (item.kind === 'melee') {
    useMelee(ctx, player, now);
  } else if (item.kind === 'bomb') {
    useBomb(ctx, player, item, now);
  } else {
    usePotion(ctx, player, item, now);
  }
}

// resolves bombs whose fuse has expired, dealing AoE damage to every enemy
// and barrel within radius - never the player, since these are their own bombs
export function resolveBombThrows(
  state: CombatState,
  store: EntityStore,
  ctx: CombatContext,
  now: number,
): void {
  for (let i = state.bombThrows.length - 1; i >= 0; i--) {
    const bomb = state.bombThrows[i];
    if (now >= bomb.impactTime) {
      const targets: Defender[] = [...getEnemies(store), ...getBarrels(store)];
      for (const t of targets) {
        if (
          tileDist(t.position.tileX, t.position.tileY, bomb.x, bomb.y) <=
          bomb.radius
        ) {
          applyDamage(ctx, t, bomb.dmg, now);
        }
      }
      state.bombThrows.splice(i, 1);
    }
  }
}

function nearestAdjacentDefender(
  ctx: ItemContext,
  player: Player,
): Enemy | Barrel | null {
  const candidates: (Enemy | Barrel)[] = [
    ...getEnemies(ctx.store),
    ...getBarrels(ctx.store),
  ];
  let best: Enemy | Barrel | null = null;
  let bestDist = Infinity;
  for (const c of candidates) {
    const footprint = actorFootprint(c);
    if (
      !tileAdjacentToFootprint(
        player.position.tileX,
        player.position.tileY,
        footprint,
      )
    )
      continue;
    const d = tileDist(
      player.position.tileX,
      player.position.tileY,
      c.position.tileX,
      c.position.tileY,
    );
    if (d < bestDist) {
      bestDist = d;
      best = c;
    }
  }
  return best;
}

// A does not path/chase - it only swings if something is already adjacent;
// chase-then-attack remains the job of mouse click-to-target.
function useMelee(ctx: ItemContext, player: Player, now: number): void {
  let target: Defender | null = null;
  if (player.attackTarget && ctx.store.entities.has(player.attackTarget.id)) {
    const footprint = actorFootprint(player.attackTarget);
    if (
      tileAdjacentToFootprint(
        player.position.tileX,
        player.position.tileY,
        footprint,
      )
    ) {
      target = player.attackTarget;
    }
  }
  if (!target) target = nearestAdjacentDefender(ctx, player);
  if (!target) return;
  attemptAttack(ctx.combatCtx, player, target, now);
  ctx.updateHud();
}

function useBomb(
  ctx: ItemContext,
  player: Player,
  item: BombItem,
  now: number,
): void {
  if (now - item.lastUsed < item.cooldown) return;
  item.lastUsed = now;

  let dx = 0;
  let dy = 0;
  if (player.movement.dir === 'up') dy = -1;
  else if (player.movement.dir === 'down') dy = 1;
  else if (player.movement.dir === 'left') dx = -1;
  else dx = 1;

  const landX = Math.max(
    1,
    Math.min(MAP_W - 2, player.position.tileX + dx * 2),
  );
  const landY = Math.max(
    1,
    Math.min(MAP_H - 2, player.position.tileY + dy * 2),
  );

  ctx.combatCtx.state.bombThrows.push({
    x: landX,
    y: landY,
    fromX: player.position.px + TILE / 2,
    fromY: player.position.py,
    bornTime: now,
    impactTime: now + item.fuseTime,
    dmg: item.damage,
    radius: item.radius,
  });
}

function usePotion(
  ctx: ItemContext,
  player: Player,
  item: PotionItem,
  now: number,
): void {
  if (now - item.lastUsed < item.cooldown) return;
  if (item.charges <= 0) return;
  if (player.health.hp >= player.health.maxHp) return;

  item.lastUsed = now;
  item.charges -= 1;
  player.health.hp = Math.min(
    player.health.maxHp,
    player.health.hp + item.healAmount,
  );
  spawnFloatingText(
    ctx.combatCtx.state,
    player,
    '+' + item.healAmount,
    '#63d17a',
    now,
  );
  ctx.updateHud();
}
