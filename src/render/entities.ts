import { TILE } from '../systems/world.ts';
import type { Health } from '../types/entities.ts';
import { BOSS_COLOR, BOSS_EDGE, TREE_CANOPY_FILL, TREE_CANOPY_EDGE, TREE_TRUNK_FILL, TREE_TRUNK_EDGE } from './colors.ts';

export function drawHpBar(ctx: CanvasRenderingContext2D, sx: number, sy: number, ratio: number): void {
  const margin = Math.max(1, Math.round(TILE * 0.16));
  const w = TILE - margin * 2;
  const h = Math.max(1, Math.round(TILE * 0.125));
  const bx = sx + margin;
  const by = sy - Math.round(TILE * 0.25);
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  ctx.fillRect(bx - 1, by - 1, w + 2, h + 2);
  let fill = '#4caf50';
  if (ratio <= 0.25) fill = '#e53935';
  else if (ratio <= 0.5) fill = '#f5a623';
  ctx.fillStyle = fill;
  ctx.fillRect(bx, by, Math.max(0, w * ratio), h);
}

export function drawSquareEntity(
  ctx: CanvasRenderingContext2D,
  sx: number,
  sy: number,
  fill: string,
  edge: string,
  inset: number,
  health: Health | undefined,
  now: number,
  persistent: boolean,
): void {
  const size = TILE - inset * 2;
  ctx.fillStyle = edge;
  ctx.fillRect(sx + inset - 1, sy + inset - 1, size + 2, size + 2);
  ctx.fillStyle = fill;
  ctx.fillRect(sx + inset, sy + inset, size, size);

  if (health && now < health.flashUntil) {
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.fillRect(sx + inset, sy + inset, size, size);
  }

  const showBar = !!health && ((now < health.hpBarUntil) || (persistent && health.hp < health.maxHp));
  if (showBar) {
    drawHpBar(ctx, sx, sy, Math.max(0, health!.hp) / health!.maxHp);
  }
}

export function drawBossHpBar(ctx: CanvasRenderingContext2D, sx: number, sy: number, ratio: number): void {
  const margin = Math.max(1, Math.round(TILE * 0.16));
  const w = TILE * 2 - margin * 2;
  const h = Math.max(2, Math.round(TILE * 0.22));
  const bx = sx + margin;
  const by = sy - Math.round(TILE * 0.4);
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  ctx.fillRect(bx - 1, by - 1, w + 2, h + 2);
  let fill = '#4caf50';
  if (ratio <= 0.25) fill = '#e53935';
  else if (ratio <= 0.5) fill = '#f5a623';
  ctx.fillStyle = fill;
  ctx.fillRect(bx, by, Math.max(0, w * ratio), h);
}

export function drawBossEntity(ctx: CanvasRenderingContext2D, sx: number, sy: number, health: Health, now: number): void {
  const inset = 6;
  const size = TILE * 2 - inset * 2;
  ctx.fillStyle = BOSS_EDGE;
  ctx.fillRect(sx + inset - 1, sy + inset - 1, size + 2, size + 2);
  ctx.fillStyle = BOSS_COLOR;
  ctx.fillRect(sx + inset, sy + inset, size, size);

  if (now < health.flashUntil) {
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.fillRect(sx + inset, sy + inset, size, size);
  }

  const showBar = now < health.hpBarUntil || health.hp < health.maxHp;
  if (showBar) {
    drawBossHpBar(ctx, sx, sy, Math.max(0, health.hp) / health.maxHp);
  }
}

// baseSx/baseSy is the screen position of the tree's trunk (bottom) tile.
// the canopy occupies the tile above and overlaps down into the trunk tile,
// and gets sorted with other actors so things standing behind it are hidden.
export function drawTree(ctx: CanvasRenderingContext2D, baseSx: number, baseSy: number): void {
  const canopyMargin = Math.max(1, Math.round(TILE * 0.06));
  const canopyOverlap = Math.round(TILE * 0.3);
  const canopyX = baseSx + canopyMargin;
  const canopyW = TILE - canopyMargin * 2;
  const canopyTopY = baseSy - TILE + canopyMargin;
  const canopyH = baseSy + canopyOverlap - canopyTopY;

  ctx.fillStyle = TREE_CANOPY_EDGE;
  ctx.fillRect(canopyX - 1, canopyTopY - 1, canopyW + 2, canopyH + 2);
  ctx.fillStyle = TREE_CANOPY_FILL;
  ctx.fillRect(canopyX, canopyTopY, canopyW, canopyH);

  const trunkW = Math.max(2, Math.round(TILE * 0.3));
  const trunkH = Math.max(2, Math.round(TILE * 0.4));
  const trunkX = baseSx + (TILE - trunkW) / 2;
  const trunkY = baseSy + TILE - trunkH;

  ctx.fillStyle = TREE_TRUNK_EDGE;
  ctx.fillRect(trunkX - 1, trunkY - 1, trunkW + 2, trunkH + 2);
  ctx.fillStyle = TREE_TRUNK_FILL;
  ctx.fillRect(trunkX, trunkY, trunkW, trunkH);
}
