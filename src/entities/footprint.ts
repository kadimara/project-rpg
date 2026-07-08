import type { Enemy, Footprint } from '../types/entities.ts';

export function actorFootprint(e: Pick<Enemy, 'tileX' | 'tileY' | 'size'>): Footprint {
  if (e.size === 2) {
    return [
      { x: e.tileX, y: e.tileY },
      { x: e.tileX + 1, y: e.tileY },
      { x: e.tileX, y: e.tileY + 1 },
      { x: e.tileX + 1, y: e.tileY + 1 },
    ];
  }
  return [{ x: e.tileX, y: e.tileY }];
}

export function footprintAt(x: number, y: number, size: 1 | 2): Footprint {
  if (size === 2) {
    return [
      { x, y },
      { x: x + 1, y },
      { x, y: y + 1 },
      { x: x + 1, y: y + 1 },
    ];
  }
  return [{ x, y }];
}

export function tileAdjacentToFootprint(px: number, py: number, footprint: Footprint): boolean {
  return footprint.some((t) => Math.abs(px - t.x) + Math.abs(py - t.y) === 1);
}
