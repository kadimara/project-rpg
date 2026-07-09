import { TILE } from './world.ts';
import type { Combatant, Defender, Position } from '../types/entities.ts';
import type { CombatState } from '../types/combat.ts';
import type { EntityStore } from '../entities/store.ts';

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
  store: EntityStore;
  onDeath: (defender: Defender, now: number) => void;
}

// Applies damage from an attacker to a defender, spawning a damage number and
// handling aggro once damaged and delegating to onDeath once the defender's
// health drops to zero.
export function applyDamage(
  ctx: CombatContext,
  defender: Defender,
  dmg: number,
  now: number,
): void {
  const { state } = ctx;
  defender.health.hp -= dmg;
  defender.health.flashUntil = now + 140;
  defender.health.hpBarUntil = now + 2000;

  spawnDamageNumber(state, defender, dmg, '#ff6b6b', now);

  if (defender.kind === 'enemy') {
    defender.aggro = true;
  }

  if (defender.health.hp <= 0) {
    ctx.onDeath(defender, now);
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
  applyDamage(ctx, defender, attacker.combat.atkDamage, now);
}
