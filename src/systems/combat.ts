import { TILE, SPAWN_X, SPAWN_Y } from './world.ts';
import type { ActorBase, Enemy, Player } from '../types/entities.ts';
import type { CombatState } from '../types/combat.ts';
import type { ItemId } from '../types/items.ts';

export function createCombatState(): CombatState {
  return { telegraphs: [], playerProjectiles: [], floatingTexts: [], respawnMessageUntil: 0 };
}

// standalone (not tied to a CombatSystem instance) so the ui bridge module can
// spawn floating text (potion heal, gold gain, item pickup) without needing a
// full combat system wired up - it only ever needs to push onto shared state
export function spawnFloatingText(state: CombatState, entity: ActorBase, text: string, color: string, now: number): void {
  state.floatingTexts.push({ worldX: entity.px + TILE / 2, worldY: entity.py, text, color, born: now });
}

export function spawnDamageNumber(state: CombatState, entity: ActorBase, dmg: number, color: string, now: number): void {
  spawnFloatingText(state, entity, '-' + dmg, color, now);
}

export interface CombatCallbacks {
  spawnGroundItem: (x: number, y: number, itemId: ItemId, qty: number) => void;
  onBossDefeated: () => void;
  updateHud: () => void;
}

export interface CombatSystem {
  applyDamage: (attacker: ActorBase, defender: Enemy | Player, dmg: number, now: number) => void;
  attemptAttack: (attacker: ActorBase, defender: Enemy | Player, now: number) => void;
  attemptRangedAttack: (attacker: ActorBase, defender: Enemy, now: number) => void;
  handlePlayerDeath: (now: number) => void;
  dealDamageToPlayer: (dmg: number, now: number) => void;
}

export function createCombatSystem(state: CombatState, enemies: Enemy[], player: Player, callbacks: CombatCallbacks): CombatSystem {
  function handlePlayerDeath(now: number): void {
    player.hp = player.maxHp;
    player.tileX = SPAWN_X;
    player.tileY = SPAWN_Y;
    player.px = SPAWN_X * TILE;
    player.py = SPAWN_Y * TILE;
    player.path = [];
    player.attackTarget = null;
    player.pickupTarget = null;
    player.talkTarget = null;
    player.moving = false;
    enemies.forEach((e) => {
      e.aggro = false;
      e.path = [];
    });
    state.respawnMessageUntil = now + 1400;
  }

  function dealDamageToPlayer(dmg: number, now: number): void {
    player.hp -= dmg;
    player.flashUntil = now + 140;
    player.hpBarUntil = now + 2000;
    spawnDamageNumber(state, player, dmg, '#ff6b6b', now);
    if (player.hp <= 0) handlePlayerDeath(now);
    callbacks.updateHud();
  }

  function applyDamage(attacker: ActorBase, defender: Enemy | Player, dmg: number, now: number): void {
    defender.hp -= dmg;
    defender.flashUntil = now + 140;
    defender.hpBarUntil = now + 2000;
    spawnDamageNumber(state, defender, dmg, attacker === player ? '#ffe08a' : '#ff6b6b', now);
    if (attacker === player && 'aggro' in defender) defender.aggro = true;
    if (defender.hp <= 0) {
      if (defender === player) {
        handlePlayerDeath(now);
      } else {
        const enemy = defender as Enemy;
        enemies.splice(enemies.indexOf(enemy), 1);
        if (player.attackTarget === enemy) {
          player.attackTarget = null;
          player.path = [];
        }
        if (enemy.isBoss) {
          callbacks.onBossDefeated();
          callbacks.spawnGroundItem(enemy.tileX, enemy.tileY, 'warden_blade', 1);
          callbacks.spawnGroundItem(enemy.tileX + 1, enemy.tileY + 1, 'warden_plate', 1);
        } else if (Math.random() < 0.35) {
          callbacks.spawnGroundItem(enemy.tileX, enemy.tileY, Math.random() < 0.5 ? 'potion_minor' : 'potion_greater', 1);
        }
      }
    }
  }

  function attemptAttack(attacker: ActorBase, defender: Enemy | Player, now: number): void {
    if (now - attacker.lastAttack < attacker.atkCooldown) return;
    attacker.lastAttack = now;
    applyDamage(attacker, defender, attacker.atkDamage, now);
  }

  function attemptRangedAttack(attacker: ActorBase, defender: Enemy, now: number): void {
    if (now - attacker.lastAttack < attacker.atkCooldown) return;
    attacker.lastAttack = now;
    state.playerProjectiles.push({
      fromX: attacker.px + TILE / 2,
      fromY: attacker.py + TILE / 2,
      target: defender,
      bornTime: now,
      arriveTime: now + 220,
      dmg: attacker.atkDamage,
    });
  }

  return { applyDamage, attemptAttack, attemptRangedAttack, handlePlayerDeath, dealDamageToPlayer };
}
