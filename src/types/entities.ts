import type { Direction, TileCoord } from './world.ts';

export type Footprint = TileCoord[];

export interface ActorBase {
  tileX: number;
  tileY: number;
  px: number;
  py: number;
  dir: Direction;
  moving: boolean;
  moveStart: number;
  moveDur: number;
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  path: TileCoord[];
  hp: number;
  maxHp: number;
  atkDamage: number;
  atkCooldown: number;
  lastAttack: number;
  flashUntil: number;
  hpBarUntil: number;
}

export interface Enemy extends ActorBase {
  size: 1 | 2;
  aggro: boolean;
  isBoss?: boolean;
  specialCooldown?: number;
  lastSpecial?: number;
  telegraphDuration?: number;
  specialDamage?: number;
}

export interface Player extends ActorBase {
  attackTarget: Enemy | null;
  pickupTarget: TileCoord | null;
  talkTarget: TileCoord | null;
}
