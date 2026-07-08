import { TileType } from '../types/world.ts';
import { TILE } from '../systems/world.ts';
import { COLORS, OBSTACLE_COLOR, OBSTACLE_EDGE } from './colors.ts';

export function drawTile(ctx: CanvasRenderingContext2D, type: TileType, sx: number, sy: number): void {
  const pair = COLORS[type] || COLORS[TileType.Grass]!;
  ctx.fillStyle = pair[0];
  ctx.fillRect(sx, sy, TILE, TILE);
  ctx.fillStyle = pair[1];
  ctx.fillRect(sx, sy, TILE / 2, TILE / 2);
  ctx.fillRect(sx + TILE / 2, sy + TILE / 2, TILE / 2, TILE / 2);
}

export function drawObstacle(ctx: CanvasRenderingContext2D, sx: number, sy: number): void {
  drawTile(ctx, TileType.Grass, sx, sy);
  const m1 = Math.max(1, Math.round(TILE * 0.09));
  const m2 = Math.max(1, Math.round(TILE * 0.16));
  ctx.fillStyle = OBSTACLE_EDGE;
  ctx.fillRect(sx + m1, sy + m1, TILE - m1 * 2, TILE - m1 * 2);
  ctx.fillStyle = OBSTACLE_COLOR;
  ctx.fillRect(sx + m2, sy + m2, TILE - m2 * 2, TILE - m2 * 2);
}
