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

export interface CombatSystem {
  applyDamage: (
    attacker: Combatant,
    defender: Defender,
    dmg: number,
    now: number,
  ) => void;
  attemptAttack: (attacker: Combatant, defender: Defender, now: number) => void;
  handlePlayerDeath: (now: number) => void;
  dealDamageToPlayer: (dmg: number, now: number) => void;
}

export function createCombatSystem(
  state: CombatState,
  enemies: Enemy[],
  barrels: Barrel[],
  player: Player,
  callbacks: CombatCallbacks,
): CombatSystem {
  function handlePlayerDeath(now: number): void {
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

  function dealDamageToPlayer(dmg: number, now: number): void {
    player.health.hp -= dmg;
    player.health.flashUntil = now + 140;
    player.health.hpBarUntil = now + 2000;
    spawnDamageNumber(state, player, dmg, '#ff6b6b', now);
    if (player.health.hp <= 0) handlePlayerDeath(now);
    callbacks.updateHud();
  }

  function applyDamage(
    attacker: Combatant,
    defender: Defender,
    dmg: number,
    now: number,
  ): void {
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
    if (attacker === player && 'aggro' in defender) defender.aggro = true;
    if (defender.health.hp <= 0) {
      if (!('combat' in defender)) {
        const barrel = defender;
        barrels.splice(barrels.indexOf(barrel), 1);
        if (player.attackTarget === barrel) {
          player.attackTarget = null;
          player.movement.path = [];
        }
      } else if ('aggro' in defender) {
        const enemy = defender;
        enemies.splice(enemies.indexOf(enemy), 1);
        if (player.attackTarget === enemy) {
          player.attackTarget = null;
          player.movement.path = [];
        }
      } else {
        handlePlayerDeath(now);
      }
    }
  }

  function attemptAttack(
    attacker: Combatant,
    defender: Defender,
    now: number,
  ): void {
    if (now - attacker.combat.lastAttack < attacker.combat.atkCooldown) return;
    attacker.combat.lastAttack = now;
    applyDamage(attacker, defender, attacker.combat.atkDamage, now);
  }

  return { applyDamage, attemptAttack, handlePlayerDeath, dealDamageToPlayer };
}
