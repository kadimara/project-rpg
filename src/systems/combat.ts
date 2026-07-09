import { TILE, SPAWN_X, SPAWN_Y } from './world.ts';
import type {
  Barrel,
  Combatant,
  Defender,
  Enemy,
  Player,
  Position,
} from '../types/entities.ts';
import type { CombatState } from '../types/combat.ts';

export function createCombatState(): CombatState {
  return { telegraphs: [], floatingTexts: [], respawnMessageUntil: 0 };
}

// Spawns a piece of floating text (damage numbers, status messages, ...) above an entity.
export function spawnFloatingText(
  state: CombatState,
  entity: { position: Position },
  text: string,
  color: string,
  now: number,
): void {
  state.floatingTexts.push({
    worldX: entity.position.px + TILE / 2,
    worldY: entity.position.py,
    text,
    color,
    born: now,
  });
}

// Shorthand for spawnFloatingText that formats a damage value as "-<dmg>".
export function spawnDamageNumber(
  state: CombatState,
  entity: { position: Position },
  dmg: number,
  color: string,
  now: number,
): void {
  spawnFloatingText(state, entity, '-' + dmg, color, now);
}

export interface CombatCallbacks {
  updateHud: () => void;
}

// Shared entities that the combat functions below read and mutate.
export interface CombatContext {
  state: CombatState;
  enemies: Enemy[];
  barrels: Barrel[];
  player: Player;
}

// Resets the player to the spawn point after death and clears enemy aggro.
export function handlePlayerDeath(ctx: CombatContext, now: number): void {
  const { state, enemies, player } = ctx;
  player.health.hp = player.health.maxHp;
  player.position.tileX = SPAWN_X;
  player.position.tileY = SPAWN_Y;
  player.position.px = SPAWN_X * TILE;
  player.position.py = SPAWN_Y * TILE;
  player.movement.path = [];
  player.attackTarget = null;
  player.movement.moving = false;
  enemies.forEach((e) => {
    e.aggro = false;
    e.movement.path = [];
  });
  state.respawnMessageUntil = now + 1400;
}

// Applies damage directly to the player (e.g. from a resolved telegraph) and handles death.
export function dealDamageToPlayer(
  ctx: CombatContext,
  dmg: number,
  now: number,
  updateHud: () => void,
): void {
  const { state, player } = ctx;
  player.health.hp -= dmg;
  player.health.flashUntil = now + 140;
  player.health.hpBarUntil = now + 2000;
  spawnDamageNumber(state, player, dmg, '#ff6b6b', now);
  if (player.health.hp <= 0) handlePlayerDeath(ctx, now);
  updateHud();
}

// Applies damage from an attacker to a defender, spawning a damage number and
// handling aggro/death/cleanup once the defender's health drops to zero.
export function applyDamage(
  ctx: CombatContext,
  attacker: Combatant,
  defender: Defender,
  dmg: number,
  now: number,
): void {
  const { state, enemies, barrels, player } = ctx;
  defender.health.hp -= dmg;
  defender.health.flashUntil = now + 140;
  defender.health.hpBarUntil = now + 2000;
  spawnDamageNumber(
    state,
    defender,
    dmg,
    attacker === player ? '#ffe08a' : '#ff6b6b',
    now,
  );
  if (attacker === player && 'aggro' in defender) {
    defender.aggro = true;
  }
  if (defender.health.hp <= 0) {
    if (!('combat' in defender)) {
      // Defender is a barrel: remove it and clear it as an attack target.
      const barrel = defender;
      barrels.splice(barrels.indexOf(barrel), 1);
      if (player.attackTarget === barrel) {
        player.attackTarget = null;
        player.movement.path = [];
      }
    } else if ('aggro' in defender) {
      // Defender is an enemy: remove it and clear it as an attack target.
      const enemy = defender;
      enemies.splice(enemies.indexOf(enemy), 1);
      if (player.attackTarget === enemy) {
        player.attackTarget = null;
        player.movement.path = [];
      }
    } else {
      // Defender is the player.
      handlePlayerDeath(ctx, now);
    }
  }
}

// Attempts an attack from attacker to defender, respecting the attacker's cooldown.
export function attemptAttack(
  ctx: CombatContext,
  attacker: Combatant,
  defender: Defender,
  now: number,
): void {
  if (now - attacker.combat.lastAttack < attacker.combat.atkCooldown) {
    return;
  }
  attacker.combat.lastAttack = now;
  applyDamage(ctx, attacker, defender, attacker.combat.atkDamage, now);
}
