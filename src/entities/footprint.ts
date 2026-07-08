import type { Footprint, Position } from '../types/entities.ts';

export function actorFootprint(e: { position: Pick<Position, 'tileX' | 'tileY'>; size: 1 | 2 }): Footprint {
  const { tileX, tileY } = e.position;
  if (e.size === 2) {
    return [
      { x: tileX, y: tileY },
      { x: tileX + 1, y: tileY },
      { x: tileX, y: tileY + 1 },
      { x: tileX + 1, y: tileY + 1 },
    ];
  }
  return [{ x: tileX, y: tileY }];
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
