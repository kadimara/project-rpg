import { TileType } from '../types/world.ts';
import type { TileGrid, Tree } from '../types/world.ts';

export const TILE = 16;
export const SPAWN_X = 0;
export const SPAWN_Y = 7;
export const MAP_W = 8;
export const MAP_H = 8;

export const WALKABLE: Record<TileType, boolean> = {
  [TileType.Grass]: true,
  [TileType.Grass2]: true,
  [TileType.Path]: true,
  [TileType.Water]: false,
  [TileType.Tree]: false,
  [TileType.Wall]: false,
};

export const TILE_NAMES: Record<TileType, string> = {
  [TileType.Grass]: 'grass',
  [TileType.Grass2]: 'grass',
  [TileType.Path]: 'dirt path',
  [TileType.Water]: 'water',
  [TileType.Tree]: 'obstacle',
  [TileType.Wall]: 'obstacle',
};

// A single 8x8 checkerboard room - every square is walkable floor, alternating
// light/dark like a chessboard. The map edge itself is the room's wall (out of
// bounds tiles are already unwalkable via terrainWalkable's bounds check), so
// no border tiles are spent on walls.
export function buildMap(): TileGrid {
  const map: TileGrid = [];
  for (let y = 0; y < MAP_H; y++) {
    const row: TileType[] = [];
    for (let x = 0; x < MAP_W; x++) {
      row.push((x + y) % 2 === 0 ? TileType.Grass2 : TileType.Grass);
    }
    map.push(row);
  }
  return map;
}

export const TREE_SPOTS: Array<[number, number]> = [];

export function buildTrees(): Tree[] {
  return TREE_SPOTS.map(([x, y]) => ({ x, y }));
}

export function treeBlocksAt(trees: Tree[], x: number, y: number): boolean {
  return trees.some((t) => t.x === x && t.y === y);
}

export function terrainWalkable(map: TileGrid, x: number, y: number): boolean {
  if (x < 0 || y < 0 || y >= map.length || x >= map[0].length) return false;
  return WALKABLE[map[y][x]];
}
