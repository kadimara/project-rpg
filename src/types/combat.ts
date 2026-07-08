import type { Enemy } from './entities.ts';

export interface Telegraph {
  x: number;
  y: number;
  fromX?: number;
  fromY?: number;
  bornTime: number;
  impactTime: number;
  dmg: number;
}

export interface PlayerProjectile {
  fromX: number;
  fromY: number;
  target: Enemy;
  bornTime: number;
  arriveTime: number;
  dmg: number;
}

export interface FloatingText {
  worldX: number;
  worldY: number;
  text: string;
  color: string;
  born: number;
}

export interface CombatState {
  telegraphs: Telegraph[];
  playerProjectiles: PlayerProjectile[];
  floatingTexts: FloatingText[];
  respawnMessageUntil: number;
}
