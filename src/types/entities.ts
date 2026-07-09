import type { Direction, TileCoord } from './world.ts';

export type Footprint = TileCoord[];

export interface Position {
  tileX: number;
  tileY: number;
  px: number;
  py: number;
}

export interface Movement {
  dir: Direction;
  moving: boolean;
  moveStart: number;
  moveDur: number;
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  path: TileCoord[];
}

export interface Health {
  hp: number;
  maxHp: number;
  flashUntil: number;
  hpBarUntil: number;
}

export interface Combat {
  atkDamage: number;
  atkCooldown: number;
  lastAttack: number;
}

export type EntityKind = 'player' | 'enemy' | 'barrel';

export interface Entity {
  id: string;
  kind: EntityKind;
}

export interface Enemy extends Entity {
  kind: 'enemy';
  position: Position;
  movement: Movement;
  health: Health;
  combat: Combat;
  size: 1 | 2;
  aggro: boolean;
  isBoss?: boolean;
  specialCooldown?: number;
  lastSpecial?: number;
  telegraphDuration?: number;
  specialDamage?: number;
}

export interface Player extends Entity {
  kind: 'player';
  position: Position;
  movement: Movement;
  health: Health;
  combat: Combat;
  attackTarget: Enemy | Barrel | null;
}

// a static, non-moving prop that only exists to soak hits and break
export interface Barrel extends Entity {
  kind: 'barrel';
  position: Position;
  health: Health;
  size: 1;
}

// either side of an attack - the only two entity kinds with Health + Combat
export type Combatant = Player | Enemy;

// anything that can be on the receiving end of an attack
export type Defender = Player | Enemy | Barrel;
