import { TileType } from '../types/world.ts';

export const COLORS: Partial<Record<TileType, [string, string]>> = {
  [TileType.Grass]: ['#4f7a52', '#456b48'],
  [TileType.Grass2]: ['#537d55', '#48704b'],
  [TileType.Path]: ['#b98f5e', '#a67d4f'],
  [TileType.Water]: ['#3f6b8a', '#356079'],
};

export const OBSTACLE_COLOR = '#7a7a82';
export const OBSTACLE_EDGE = '#57575e';
export const PLAYER_COLOR = '#3b6bd6';
export const PLAYER_EDGE = '#274a99';
export const ENEMY_COLOR = '#d63b3b';
export const ENEMY_EDGE = '#992727';
export const BOSS_COLOR = '#7a1e3d';
export const BOSS_EDGE = '#450f22';
export const TREE_CANOPY_FILL = '#3f7d43';
export const TREE_CANOPY_EDGE = '#2b5a2e';
export const TREE_TRUNK_FILL = '#7a5636';
export const TREE_TRUNK_EDGE = '#54391f';
export const BARREL_COLOR = '#a67c3d';
export const BARREL_EDGE = '#6e502a';
