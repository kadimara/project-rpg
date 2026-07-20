import { TILE } from '../systems/world.ts';
import type { TileCoord } from '../types/world.ts';
import type { Player, Enemy, Barrel } from '../types/entities.ts';
import { findPath } from '../systems/pathfinding.ts';
import type { WalkableFn } from '../systems/pathfinding.ts';

export function screenToTile(
  canvas: HTMLCanvasElement,
  camX: number,
  camY: number,
  clientX: number,
  clientY: number,
): TileCoord {
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

export function createHoverTracker(
  canvas: HTMLCanvasElement,
  getCamera: () => { camX: number; camY: number },
): HoverTracker {
  let hoveredTile: TileCoord | null = null;
  canvas.addEventListener('pointermove', (e) => {
    const { camX, camY } = getCamera();
    hoveredTile = screenToTile(canvas, camX, camY, e.clientX, e.clientY);
  });
  canvas.addEventListener('pointerleave', () => {
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
  barrelAtTile: (x: number, y: number) => Barrel | undefined;
  walkable: WalkableFn;
  getCamera: () => { camX: number; camY: number };
}

// resolves a canvas click/tap into whichever action applies: attack a clicked
// enemy or barrel, or just walk to the clicked tile
export function createClickHandler(
  canvas: HTMLCanvasElement,
  deps: ClickHandlerDeps,
): void {
  canvas.addEventListener('pointerup', (e) => {
    if (!e.isPrimary) return;
    const { camX, camY } = deps.getCamera();
    const { x, y } = screenToTile(canvas, camX, camY, e.clientX, e.clientY);
    const player = deps.player;

    const target = deps.enemyAtTile(x, y) ?? deps.barrelAtTile(x, y);
    if (target) {
      player.attackTarget = target;
      player.movement.path = [];
      return;
    }

    const path = findPath(
      deps.walkable,
      player.position.tileX,
      player.position.tileY,
      x,
      y,
    );
    if (path.length) {
      player.attackTarget = null;
      player.movement.path = path;
    }
  });
}
