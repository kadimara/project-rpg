import type { TileGrid, Tree } from '../types/world.ts';
import type { Player, Enemy, Barrel } from '../types/entities.ts';
import { terrainWalkable, treeBlocksAt } from './world.ts';
import { enemyAt } from '../entities/enemies.ts';
import { barrelAt } from '../entities/barrels.ts';
import { actorFootprint, footprintAt } from '../entities/footprint.ts';

export interface WalkabilityDeps {
  map: TileGrid;
  trees: Tree[];
  player: Player;
  enemies: Enemy[];
  barrels: Barrel[];
}

export interface WalkabilityPredicates {
  walkable: (x: number, y: number) => boolean;
  enemyChaseWalkable: (x: number, y: number, self: Enemy) => boolean;
  bossFootprintWalkable: (x: number, y: number, self: Enemy) => boolean;
}

// player-facing walkability: terrain + no stepping onto any enemy tile or tree trunk
// enemy-facing walkability (1x1 movers): terrain + not onto player + not onto other enemies + not onto tree trunks
// boss-facing walkability: same rules, but every tile in the proposed 2x2 footprint must be clear
export function createWalkabilityPredicates(deps: WalkabilityDeps): WalkabilityPredicates {
  const { map, trees, player, enemies, barrels } = deps;

  function walkable(x: number, y: number): boolean {
    return terrainWalkable(map, x, y) && !enemyAt(enemies, x, y) && !treeBlocksAt(trees, x, y) && !barrelAt(barrels, x, y);
  }

  function enemyChaseWalkable(x: number, y: number, self: Enemy): boolean {
    if (!terrainWalkable(map, x, y)) return false;
    if (treeBlocksAt(trees, x, y)) return false;
    if (barrelAt(barrels, x, y)) return false;
    if (x === player.position.tileX && y === player.position.tileY) return false;
    if (enemies.some((e) => e !== self && actorFootprint(e).some((t) => t.x === x && t.y === y))) return false;
    return true;
  }

  function bossFootprintWalkable(x: number, y: number, self: Enemy): boolean {
    for (const t of footprintAt(x, y, 2)) {
      if (!terrainWalkable(map, t.x, t.y)) return false;
      if (treeBlocksAt(trees, t.x, t.y)) return false;
      if (barrelAt(barrels, t.x, t.y)) return false;
      if (t.x === player.position.tileX && t.y === player.position.tileY) return false;
      if (enemies.some((e) => e !== self && actorFootprint(e).some((et) => et.x === t.x && et.y === t.y))) return false;
    }
    return true;
  }

  return { walkable, enemyChaseWalkable, bossFootprintWalkable };
}
