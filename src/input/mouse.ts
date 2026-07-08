import { TILE } from '../systems/world.ts';
import type { TileCoord } from '../types/world.ts';
import type { Player, Enemy } from '../types/entities.ts';
import type { Npc } from '../types/npc.ts';
import type { GroundItem } from '../types/items.ts';
import { findPath, bfsChase } from '../systems/pathfinding.ts';
import type { WalkableFn } from '../systems/pathfinding.ts';
import { tileAdjacentToFootprint } from '../entities/footprint.ts';

export function screenToTile(canvas: HTMLCanvasElement, camX: number, camY: number, clientX: number, clientY: number): TileCoord {
  const rect = canvas.getBoundingClientRect();
  const cssX = clientX - rect.left;
  const cssY = clientY - rect.top;
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  const canvasX = cssX * scaleX;
  const canvasY = cssY * scaleY;
  const worldX = canvasX + camX;
  const worldY = canvasY + camY;
  return { x: Math.floor(worldX / TILE), y: Math.floor(worldY / TILE) };
}

export interface HoverTracker {
  readonly hoveredTile: TileCoord | null;
}

export function createHoverTracker(canvas: HTMLCanvasElement, getCamera: () => { camX: number; camY: number }): HoverTracker {
  let hoveredTile: TileCoord | null = null;
  canvas.addEventListener('mousemove', (e) => {
    const { camX, camY } = getCamera();
    hoveredTile = screenToTile(canvas, camX, camY, e.clientX, e.clientY);
  });
  canvas.addEventListener('mouseleave', () => {
    hoveredTile = null;
  });
  return {
    get hoveredTile() {
      return hoveredTile;
    },
  };
}

export interface ClickHandlerDeps {
  player: Player;
  enemyAtTile: (x: number, y: number) => Enemy | undefined;
  npcAt: (x: number, y: number) => Npc | undefined;
  groundItemAt: (x: number, y: number) => GroundItem | undefined;
  tryPickupGroundItems: (x: number, y: number) => void;
  interactWithNpc: (npc: Npc) => void;
  walkable: WalkableFn;
  getCamera: () => { camX: number; camY: number };
}

// resolves a canvas click into whichever action applies: attack a clicked enemy,
// approach+talk to a clicked npc, walk to and collect a clicked ground item, or
// just walk to the clicked tile
export function createClickHandler(canvas: HTMLCanvasElement, deps: ClickHandlerDeps): void {
  canvas.addEventListener('click', (e) => {
    const { camX, camY } = deps.getCamera();
    const { x, y } = screenToTile(canvas, camX, camY, e.clientX, e.clientY);
    const player = deps.player;

    const target = deps.enemyAtTile(x, y);
    if (target) {
      player.attackTarget = target;
      player.pickupTarget = null;
      player.talkTarget = null;
      player.path = [];
      return;
    }

    const clickedNpc = deps.npcAt(x, y);
    if (clickedNpc) {
      player.attackTarget = null;
      player.pickupTarget = null;
      if (tileAdjacentToFootprint(player.tileX, player.tileY, [{ x, y }])) {
        player.talkTarget = null;
        player.path = [];
        deps.interactWithNpc(clickedNpc);
      } else {
        const path = bfsChase(deps.walkable, player.tileX, player.tileY, (px, py) => tileAdjacentToFootprint(px, py, [{ x, y }]));
        if (path.length) {
          player.talkTarget = { x, y };
          player.path = path;
        }
      }
      return;
    }

    const item = deps.groundItemAt(x, y);
    if (item) {
      player.attackTarget = null;
      player.talkTarget = null;
      if (player.tileX === x && player.tileY === y) {
        deps.tryPickupGroundItems(x, y);
        player.pickupTarget = null;
        player.path = [];
      } else {
        const path = findPath(deps.walkable, player.tileX, player.tileY, x, y);
        if (path.length) {
          player.pickupTarget = { x, y };
          player.path = path;
        }
      }
      return;
    }

    const path = findPath(deps.walkable, player.tileX, player.tileY, x, y);
    if (path.length) {
      player.attackTarget = null;
      player.pickupTarget = null;
      player.talkTarget = null;
      player.path = path;
    }
  });
}
