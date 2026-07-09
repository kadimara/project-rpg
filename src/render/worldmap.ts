import { TileType } from '../types/world.ts';
import type { TileGrid, Tree } from '../types/world.ts';
import type { Player, Enemy, Barrel } from '../types/entities.ts';
import {
  COLORS,
  OBSTACLE_COLOR,
  TREE_CANOPY_FILL,
  PLAYER_COLOR,
  ENEMY_COLOR,
  BOSS_COLOR,
  BARREL_COLOR,
} from './colors.ts';
import { MAP_W, MAP_H } from '../systems/world.ts';

export const WORLD_TILE = 8;

export interface WorldMapDeps {
  map: TileGrid;
  trees: Tree[];
  enemies: Enemy[];
  barrels: Barrel[];
  player: Player;
}

export function renderWorldMap(
  worldCtx: CanvasRenderingContext2D,
  deps: WorldMapDeps,
): void {
  const { map, trees, enemies, barrels, player } = deps;

  for (let y = 0; y < MAP_H; y++) {
    for (let x = 0; x < MAP_W; x++) {
      const t = map[y][x];
      const color =
        t === TileType.Wall
          ? OBSTACLE_COLOR
          : COLORS[t]
            ? COLORS[t]![0]
            : '#4f7a52';
      worldCtx.fillStyle = color;
      worldCtx.fillRect(x * WORLD_TILE, y * WORLD_TILE, WORLD_TILE, WORLD_TILE);
    }
  }
  for (const t of trees) {
    worldCtx.fillStyle = TREE_CANOPY_FILL;
    worldCtx.fillRect(
      t.x * WORLD_TILE,
      t.y * WORLD_TILE,
      WORLD_TILE,
      WORLD_TILE,
    );
  }
  for (const b of barrels) {
    worldCtx.fillStyle = BARREL_COLOR;
    worldCtx.fillRect(
      b.position.tileX * WORLD_TILE,
      b.position.tileY * WORLD_TILE,
      WORLD_TILE,
      WORLD_TILE,
    );
  }
  for (const en of enemies) {
    worldCtx.fillStyle = en.size === 2 ? BOSS_COLOR : ENEMY_COLOR;
    const span = en.size === 2 ? WORLD_TILE * 2 : WORLD_TILE;
    worldCtx.fillRect(
      en.position.tileX * WORLD_TILE,
      en.position.tileY * WORLD_TILE,
      span,
      span,
    );
  }
  worldCtx.fillStyle = PLAYER_COLOR;
  worldCtx.fillRect(
    player.position.tileX * WORLD_TILE - 1,
    player.position.tileY * WORLD_TILE - 1,
    WORLD_TILE + 2,
    WORLD_TILE + 2,
  );
}
