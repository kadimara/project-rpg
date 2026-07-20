import { TILE, MAP_W, MAP_H } from '../systems/world.ts';

export function getClampedCamX(playerPx: number, viewportPxW: number): number {
  const camX = playerPx + TILE / 2 - viewportPxW / 2;
  const maxCamX = MAP_W * TILE - viewportPxW;
  return Math.max(0, Math.min(maxCamX, camX));
}

export function getClampedCamY(playerPy: number, viewportPxH: number): number {
  const camY = playerPy + TILE / 2 - viewportPxH / 2;
  const maxCamY = MAP_H * TILE - viewportPxH;
  return Math.max(0, Math.min(maxCamY, camY));
}
