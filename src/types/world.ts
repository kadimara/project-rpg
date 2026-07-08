export const TileType = {
  Grass: 0,
  Grass2: 1,
  Path: 2,
  Water: 3,
  Tree: 4,
  Wall: 5,
} as const;
export type TileType = (typeof TileType)[keyof typeof TileType];

export type Direction = 'up' | 'down' | 'left' | 'right';

export interface TileCoord {
  x: number;
  y: number;
}

export type TileGrid = TileType[][];

export interface Tree {
  x: number;
  y: number;
}
