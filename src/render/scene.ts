import { TileType } from '../types/world.ts';
import type { TileGrid, Tree, TileCoord } from '../types/world.ts';
import type { Player, Enemy, Barrel } from '../types/entities.ts';
import type { CombatState } from '../types/combat.ts';
import {
  TILE,
  MAP_W,
  MAP_H,
  terrainWalkable,
  treeBlocksAt,
} from '../systems/world.ts';
import { getClampedCamX, getClampedCamY } from './camera.ts';
import { drawTile, drawObstacle } from './tiles.ts';
import { drawTree, drawSquareEntity, drawBossEntity } from './entities.ts';
import {
  PLAYER_COLOR,
  PLAYER_EDGE,
  ENEMY_COLOR,
  ENEMY_EDGE,
  BOSS_EDGE,
  BARREL_COLOR,
  BARREL_EDGE,
  BOMB_COLOR,
  BOMB_EDGE,
  BOMB_MARKER_RGB,
  BOMB_MARKER_STROKE_RGB,
} from './colors.ts';

interface ArcEffect {
  x: number;
  y: number;
  fromX?: number;
  fromY?: number;
  bornTime: number;
  impactTime: number;
}

// ground "impact zone" marker, growing more solid as impact approaches
function drawImpactMarker(
  ctx: CanvasRenderingContext2D,
  camX: number,
  camY: number,
  tg: ArcEffect,
  now: number,
  fillRgb: string,
  strokeRgb: string,
): void {
  const total = tg.impactTime - tg.bornTime;
  const progress = Math.min(1, (now - tg.bornTime) / total);
  const sx = tg.x * TILE - camX;
  const sy = tg.y * TILE - camY;
  ctx.fillStyle = `rgba(${fillRgb},${(0.12 + progress * 0.38).toFixed(2)})`;
  ctx.fillRect(sx, sy, TILE, TILE);
  ctx.strokeStyle = `rgba(${strokeRgb},${(0.5 + progress * 0.5).toFixed(2)})`;
  ctx.lineWidth = 1;
  ctx.strokeRect(sx + 0.5, sy + 0.5, TILE - 1, TILE - 1);
}

// flying projectile that arcs from its launch point to the landing tile
function drawArcProjectile(
  ctx: CanvasRenderingContext2D,
  camX: number,
  camY: number,
  tg: ArcEffect,
  now: number,
  edgeColor: string,
  fillColor: string,
): void {
  if (tg.fromX === undefined || tg.fromY === undefined) return;
  const total = tg.impactTime - tg.bornTime;
  const progress = Math.min(1, (now - tg.bornTime) / total);
  const toX = tg.x * TILE + TILE / 2;
  const toY = tg.y * TILE + TILE / 2;
  const curX = tg.fromX + (toX - tg.fromX) * progress;
  const curY = tg.fromY + (toY - tg.fromY) * progress;
  const arc = Math.sin(progress * Math.PI) * TILE * 1.6;
  const px = curX - camX;
  const py = curY - camY - arc;

  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.beginPath();
  ctx.ellipse(curX - camX, curY - camY, 3, 1.5, 0, 0, Math.PI * 2);
  ctx.fill();

  const projSize = Math.max(3, Math.round(TILE * 0.3));
  ctx.fillStyle = edgeColor;
  ctx.fillRect(
    px - projSize / 2 - 1,
    py - projSize / 2 - 1,
    projSize + 2,
    projSize + 2,
  );
  ctx.fillStyle = fillColor;
  ctx.fillRect(px - projSize / 2, py - projSize / 2, projSize, projSize);
}

export interface SceneDeps {
  map: TileGrid;
  trees: Tree[];
  player: Player;
  enemies: Enemy[];
  barrels: Barrel[];
  state: CombatState;
  hoveredTile: TileCoord | null;
  aiming: boolean;
}

interface Sortable {
  footY: number;
  draw: () => void;
}

export function renderScene(
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  now: number,
  deps: SceneDeps,
): void {
  const { map, trees, player, enemies, barrels, state, hoveredTile, aiming } =
    deps;

  const camX = getClampedCamX(player.position.px, canvas.width);
  const camY = getClampedCamY(player.position.py, canvas.height);

  ctx.fillStyle = '#0a0a0a';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const startCol = Math.floor(camX / TILE);
  const startRow = Math.floor(camY / TILE);
  const offX = -(camX - startCol * TILE);
  const offY = -(camY - startRow * TILE);

  const colsToDraw = canvas.width / TILE + 2;
  const rowsToDraw = canvas.height / TILE + 2;

  for (let r = 0; r < rowsToDraw; r++) {
    for (let c = 0; c < colsToDraw; c++) {
      const mx = startCol + c;
      const my = startRow + r;
      if (mx < 0 || my < 0 || mx >= MAP_W || my >= MAP_H) continue;
      const sx = offX + c * TILE;
      const sy = offY + r * TILE;
      const t = map[my][mx];
      if (t === TileType.Wall) drawObstacle(ctx, sx, sy);
      else drawTile(ctx, t, sx, sy);
    }
  }

  for (const step of player.movement.path) {
    const cx = step.x * TILE + TILE / 2 - camX;
    const cy = step.y * TILE + TILE / 2 - camY;
    ctx.fillStyle = 'rgba(240,230,210,0.75)';
    ctx.beginPath();
    ctx.arc(cx, cy, 1.5, 0, Math.PI * 2);
    ctx.fill();
  }

  // telegraphed projectile landing zones - grow more solid as impact approaches
  for (const tg of state.telegraphs) {
    drawImpactMarker(ctx, camX, camY, tg, now, '214,59,59', '255,110,110');
  }
  // thrown bomb landing zones
  for (const bomb of state.bombThrows) {
    drawImpactMarker(
      ctx,
      camX,
      camY,
      bomb,
      now,
      BOMB_MARKER_RGB,
      BOMB_MARKER_STROKE_RGB,
    );
  }

  // trees, enemies, and the player all get sorted by their "foot" position
  // (the bottom edge of their tile) so nearer objects draw over farther ones -
  // this is what lets a character walk behind a tree's canopy correctly.
  const sortables: Sortable[] = [];
  for (const t of trees) {
    const sx = t.x * TILE - camX;
    const sy = t.y * TILE - camY;
    if (
      sx < -TILE * 2 ||
      sy < -TILE * 2 ||
      sx > canvas.width + TILE ||
      sy > canvas.height + TILE
    )
      continue;
    sortables.push({
      footY: (t.y + 1) * TILE,
      draw: () => drawTree(ctx, sx, sy),
    });
  }
  for (const b of barrels) {
    const sx = b.position.px - camX;
    const sy = b.position.py - camY;
    if (sx < -TILE || sy < -TILE || sx > canvas.width || sy > canvas.height)
      continue;
    sortables.push({
      footY: b.position.py + TILE,
      draw: () =>
        drawSquareEntity(
          ctx,
          sx,
          sy,
          BARREL_COLOR,
          BARREL_EDGE,
          3,
          b.health,
          now,
          true,
        ),
    });
  }
  for (const en of enemies) {
    const sx = en.position.px - camX;
    const sy = en.position.py - camY;
    if (en.size === 2) {
      if (
        sx < -TILE * 2 ||
        sy < -TILE * 2 ||
        sx > canvas.width + TILE ||
        sy > canvas.height + TILE
      )
        continue;
      sortables.push({
        footY: en.position.py + TILE * 2,
        draw: () => drawBossEntity(ctx, sx, sy, en.health, now),
      });
    } else {
      if (sx < -TILE || sy < -TILE || sx > canvas.width || sy > canvas.height)
        continue;
      sortables.push({
        footY: en.position.py + TILE,
        draw: () =>
          drawSquareEntity(
            ctx,
            sx,
            sy,
            ENEMY_COLOR,
            ENEMY_EDGE,
            3,
            en.health,
            now,
            true,
          ),
      });
    }
  }
  {
    const sx = player.position.px - camX;
    const sy = player.position.py - camY;
    sortables.push({
      footY: player.position.py + TILE,
      draw: () =>
        drawSquareEntity(
          ctx,
          sx,
          sy,
          PLAYER_COLOR,
          PLAYER_EDGE,
          3,
          player.health,
          now,
          true,
        ),
    });
  }
  sortables.sort((a, b) => a.footY - b.footY);
  for (const s of sortables) s.draw();

  // flying projectiles for active telegraphs - arc from the boss to the landing tile
  for (const tg of state.telegraphs) {
    drawArcProjectile(ctx, camX, camY, tg, now, BOSS_EDGE, '#ff7a4a');
  }
  // flying bombs - arc from the player to the landing tile
  for (const bomb of state.bombThrows) {
    drawArcProjectile(ctx, camX, camY, bomb, now, BOMB_EDGE, BOMB_COLOR);
  }

  if (
    hoveredTile &&
    hoveredTile.x >= 0 &&
    hoveredTile.y >= 0 &&
    hoveredTile.x < MAP_W &&
    hoveredTile.y < MAP_H
  ) {
    const hx = hoveredTile.x * TILE - camX;
    const hy = hoveredTile.y * TILE - camY;
    const isObstacle =
      !terrainWalkable(map, hoveredTile.x, hoveredTile.y) ||
      treeBlocksAt(trees, hoveredTile.x, hoveredTile.y);
    ctx.strokeStyle = isObstacle
      ? '#7a7a82'
      : aiming
        ? `rgb(${BOMB_MARKER_STROKE_RGB})`
        : '#ffffff';
    ctx.lineWidth = 1;
    ctx.strokeRect(hx + 0.5, hy + 0.5, TILE - 1, TILE - 1);
  }

  // floating damage numbers
  for (let i = state.floatingTexts.length - 1; i >= 0; i--) {
    const ft = state.floatingTexts[i];
    const age = now - ft.born;
    if (age > 700) {
      state.floatingTexts.splice(i, 1);
      continue;
    }
    const alpha = 1 - age / 700;
    const yOff = (age / 700) * 9;
    ctx.globalAlpha = alpha;
    ctx.fillStyle = ft.color;
    ctx.font = 'bold 6px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(ft.text, ft.worldX - camX, ft.worldY - camY - yOff);
    ctx.globalAlpha = 1;
  }

  const grad = ctx.createRadialGradient(
    canvas.width / 2,
    canvas.height / 2,
    canvas.height / 2.2,
    canvas.width / 2,
    canvas.height / 2,
    canvas.height / 1.1,
  );
  grad.addColorStop(0, 'rgba(0,0,0,0)');
  grad.addColorStop(1, 'rgba(0,0,0,0.35)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  if (now < state.respawnMessageUntil) {
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#f0e6d2';
    ctx.font = 'bold 7px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(
      'you were struck down...',
      canvas.width / 2,
      canvas.height / 2 - 4,
    );
    ctx.font = '6px monospace';
    ctx.fillText(
      'respawning at the threshold',
      canvas.width / 2,
      canvas.height / 2 + 5,
    );
  }
}
