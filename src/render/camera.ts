import { TILE, VP_W, VP_H, MAP_W, MAP_H } from '../systems/world.ts';

export function getClampedCamX(playerPx: number): number {
  const camX = playerPx + TILE / 2 - (VP_W * TILE) / 2;
  const maxCamX = MAP_W * TILE - VP_W * TILE;
  return Math.max(0, Math.min(maxCamX, camX));
}

export function getClampedCamY(playerPy: number): number {
  const camY = playerPy + TILE / 2 - (VP_H * TILE) / 2;
  const maxCamY = MAP_H * TILE - VP_H * TILE;
  return Math.max(0, Math.min(maxCamY, camY));
}
