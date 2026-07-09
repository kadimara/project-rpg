import { TileType } from '../types/world.ts';
import type { TileGrid, Tree } from '../types/world.ts';

export const TILE = 16;
export const VP_W = 13;
export const VP_H = 9;
export const SPAWN_X = 3;
export const SPAWN_Y = 3;
export const MAP_W = 24;
export const MAP_H = 18;

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

export function buildMap(): TileGrid {
  const map: TileGrid = [];
  for (let y = 0; y < MAP_H; y++) {
    const row: TileType[] = [];
    for (let x = 0; x < MAP_W; x++) {
      if (x === 0 || y === 0 || x === MAP_W - 1 || y === MAP_H - 1) {
        row.push(TileType.Wall);
      } else {
        row.push((x + y) % 5 === 0 ? TileType.Grass2 : TileType.Grass);
      }
    }
    map.push(row);
  }
  let px = 2;
  for (let y = 2; y < MAP_H - 2; y++) {
    map[y][px] = TileType.Path;
    if (Math.random() < 0.4 && px < MAP_W - 3) px++;
    if (Math.random() < 0.15 && px > 2) px--;
    map[y][px] = TileType.Path;
  }
  for (let x = px; x < MAP_W - 2; x++) map[MAP_H - 6][x] = TileType.Path;

  for (let y = 3; y <= 5; y++) {
    for (let x = 15; x <= 19; x++) {
      if ((x - 17) ** 2 + (y - 4) ** 2 <= 5) map[y][x] = TileType.Water;
    }
  }
  map[9][9] = TileType.Wall;
  map[9][10] = TileType.Wall;
  map[10][10] = TileType.Wall;

  return map;
}

// trees are 1x2 props: {x,y} is the trunk (bottom) tile, which is the only
// part that blocks movement. The canopy renders into the tile above it.
export const TREE_SPOTS: Array<[number, number]> = [
  [4, 4],
  [5, 4],
  [4, 10],
  [6, 12],
  [10, 3],
  [11, 3],
  [18, 10],
  [19, 12],
  [20, 7],
  [8, 14],
  [14, 14],
  [15, 14],
  [3, 8],
  [21, 4],
];

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
