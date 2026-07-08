import { TileType } from '../types/world.ts';
import type { TileGrid, Tree } from '../types/world.ts';
import type { Player, Enemy } from '../types/entities.ts';
import type { Npc } from '../types/npc.ts';
import type { GroundItem } from '../types/items.ts';
import { ITEM_DEFS } from '../types/items.ts';
import { COLORS, OBSTACLE_COLOR, TREE_CANOPY_FILL, PLAYER_COLOR, ENEMY_COLOR, BOSS_COLOR } from './colors.ts';
import { MAP_W, MAP_H } from '../systems/world.ts';

export const WORLD_TILE = 8;

export interface WorldMapDeps {
  map: TileGrid;
  trees: Tree[];
  groundItems: GroundItem[];
  npcs: Npc[];
  enemies: Enemy[];
  player: Player;
}

export function renderWorldMap(worldCtx: CanvasRenderingContext2D, deps: WorldMapDeps): void {
  const { map, trees, groundItems, npcs, enemies, player } = deps;

  for (let y = 0; y < MAP_H; y++) {
    for (let x = 0; x < MAP_W; x++) {
      const t = map[y][x];
      const color = t === TileType.Wall ? OBSTACLE_COLOR : COLORS[t] ? COLORS[t]![0] : '#4f7a52';
      worldCtx.fillStyle = color;
      worldCtx.fillRect(x * WORLD_TILE, y * WORLD_TILE, WORLD_TILE, WORLD_TILE);
    }
  }
  for (const t of trees) {
    worldCtx.fillStyle = TREE_CANOPY_FILL;
    worldCtx.fillRect(t.x * WORLD_TILE, t.y * WORLD_TILE, WORLD_TILE, WORLD_TILE);
  }
  for (const g of groundItems) {
    const def = ITEM_DEFS[g.itemId];
    worldCtx.fillStyle = def.color;
    worldCtx.fillRect(g.x * WORLD_TILE + 2, g.y * WORLD_TILE + 2, WORLD_TILE - 4, WORLD_TILE - 4);
  }
  for (const n of npcs) {
    worldCtx.fillStyle = n.color;
    worldCtx.fillRect(n.tileX * WORLD_TILE, n.tileY * WORLD_TILE, WORLD_TILE, WORLD_TILE);
  }
  for (const en of enemies) {
    worldCtx.fillStyle = en.size === 2 ? BOSS_COLOR : ENEMY_COLOR;
    const span = en.size === 2 ? WORLD_TILE * 2 : WORLD_TILE;
    worldCtx.fillRect(en.tileX * WORLD_TILE, en.tileY * WORLD_TILE, span, span);
  }
  worldCtx.fillStyle = PLAYER_COLOR;
  worldCtx.fillRect(player.tileX * WORLD_TILE - 1, player.tileY * WORLD_TILE - 1, WORLD_TILE + 2, WORLD_TILE + 2);
}
