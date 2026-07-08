import { TileType } from '../types/world.ts';
import type { TileGrid, Tree, TileCoord } from '../types/world.ts';
import type { Player, Enemy } from '../types/entities.ts';
import type { Npc } from '../types/npc.ts';
import type { GroundItem } from '../types/items.ts';
import { ITEM_DEFS } from '../types/items.ts';
import type { CombatState } from '../types/combat.ts';
import { TILE, VP_W, VP_H, MAP_W, MAP_H, terrainWalkable, treeBlocksAt } from '../systems/world.ts';
import { getClampedCamX, getClampedCamY } from './camera.ts';
import { drawTile, drawObstacle } from './tiles.ts';
import { drawTree, drawSquareEntity, drawBossEntity } from './entities.ts';
import type { Drawable } from './entities.ts';
import { PLAYER_COLOR, PLAYER_EDGE, ENEMY_COLOR, ENEMY_EDGE, BOSS_EDGE } from './colors.ts';

export interface SceneDeps {
  map: TileGrid;
  trees: Tree[];
  player: Player;
  enemies: Enemy[];
  npcs: Npc[];
  groundItems: GroundItem[];
  state: CombatState;
  hoveredTile: TileCoord | null;
  getNpcQuestMarker: (npc: Npc) => boolean;
}

interface Sortable {
  footY: number;
  draw: () => void;
}

export function renderScene(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, now: number, deps: SceneDeps): void {
  const { map, trees, player, enemies, npcs, groundItems, state, hoveredTile, getNpcQuestMarker } = deps;

  const camX = getClampedCamX(player.px);
  const camY = getClampedCamY(player.py);

  ctx.fillStyle = '#0a0a0a';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const startCol = Math.floor(camX / TILE);
  const startRow = Math.floor(camY / TILE);
  const offX = -(camX - startCol * TILE);
  const offY = -(camY - startRow * TILE);

  const colsToDraw = VP_W + 2;
  const rowsToDraw = VP_H + 2;

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

  for (const step of player.path) {
    const cx = step.x * TILE + TILE / 2 - camX;
    const cy = step.y * TILE + TILE / 2 - camY;
    ctx.fillStyle = 'rgba(240,230,210,0.75)';
    ctx.beginPath();
    ctx.arc(cx, cy, 1.5, 0, Math.PI * 2);
    ctx.fill();
  }

  // telegraphed projectile landing zones - grow more solid as impact approaches
  for (const tg of state.telegraphs) {
    const total = tg.impactTime - tg.bornTime;
    const progress = Math.min(1, (now - tg.bornTime) / total);
    const sx = tg.x * TILE - camX;
    const sy = tg.y * TILE - camY;
    ctx.fillStyle = 'rgba(214,59,59,' + (0.12 + progress * 0.38).toFixed(2) + ')';
    ctx.fillRect(sx, sy, TILE, TILE);
    ctx.strokeStyle = 'rgba(255,110,110,' + (0.5 + progress * 0.5).toFixed(2) + ')';
    ctx.lineWidth = 1;
    ctx.strokeRect(sx + 0.5, sy + 0.5, TILE - 1, TILE - 1);
  }

  for (const g of groundItems) {
    const def = ITEM_DEFS[g.itemId];
    const sx = g.x * TILE - camX;
    const sy = g.y * TILE - camY;
    if (sx < -TILE || sy < -TILE || sx > canvas.width || sy > canvas.height) continue;
    const size = Math.max(4, Math.round(TILE * 0.42));
    const ix = sx + (TILE - size) / 2;
    const iy = sy + (TILE - size) / 2 - 1;
    ctx.fillStyle = def.edge;
    ctx.fillRect(ix - 1, iy - 1, size + 2, size + 2);
    ctx.fillStyle = def.color;
    ctx.fillRect(ix, iy, size, size);
  }

  // trees, enemies, and the player all get sorted by their "foot" position
  // (the bottom edge of their tile) so nearer objects draw over farther ones -
  // this is what lets a character walk behind a tree's canopy correctly.
  const sortables: Sortable[] = [];
  for (const t of trees) {
    const sx = t.x * TILE - camX;
    const sy = t.y * TILE - camY;
    if (sx < -TILE * 2 || sy < -TILE * 2 || sx > canvas.width + TILE || sy > canvas.height + TILE) continue;
    sortables.push({ footY: (t.y + 1) * TILE, draw: () => drawTree(ctx, sx, sy) });
  }
  for (const en of enemies) {
    const sx = en.px - camX;
    const sy = en.py - camY;
    if (en.size === 2) {
      if (sx < -TILE * 2 || sy < -TILE * 2 || sx > canvas.width + TILE || sy > canvas.height + TILE) continue;
      sortables.push({ footY: en.py + TILE * 2, draw: () => drawBossEntity(ctx, sx, sy, en, now) });
    } else {
      if (sx < -TILE || sy < -TILE || sx > canvas.width || sy > canvas.height) continue;
      sortables.push({ footY: en.py + TILE, draw: () => drawSquareEntity(ctx, sx, sy, ENEMY_COLOR, ENEMY_EDGE, 3, en, now, true) });
    }
  }
  for (const n of npcs) {
    const sx = n.px - camX;
    const sy = n.py - camY;
    if (sx <= -TILE || sy <= -TILE || sx >= canvas.width || sy >= canvas.height) continue;
    sortables.push({
      footY: n.py + TILE,
      draw: () => {
        drawSquareEntity(ctx, sx, sy, n.color, n.edge, 3, n as Drawable, now, false);
        if (getNpcQuestMarker(n)) {
          const bob = Math.sin(now / 300) * 1.5;
          ctx.fillStyle = '#ffd76b';
          ctx.beginPath();
          ctx.arc(sx + TILE / 2, sy - 4 + bob, 2.2, 0, Math.PI * 2);
          ctx.fill();
        }
      },
    });
  }
  {
    const sx = player.px - camX;
    const sy = player.py - camY;
    sortables.push({ footY: player.py + TILE, draw: () => drawSquareEntity(ctx, sx, sy, PLAYER_COLOR, PLAYER_EDGE, 3, player, now, true) });
  }
  sortables.sort((a, b) => a.footY - b.footY);
  for (const s of sortables) s.draw();

  // flying projectiles for active telegraphs - arc from the boss to the landing tile
  for (const tg of state.telegraphs) {
    if (tg.fromX === undefined || tg.fromY === undefined) continue;
    const total = tg.impactTime - tg.bornTime;
    const progress = Math.min(1, (now - tg.bornTime) / total);
    const toX = tg.x * TILE + TILE / 2;
    const toY = tg.y * TILE + TILE / 2;
    const curX = tg.fromX + (toX - tg.fromX) * progress;
    const curY = tg.fromY + (toY - tg.fromY) * progress;
    const arc = Math.sin(progress * Math.PI) * TILE * 1.6;
    const px = curX - camX;
    const py = curY - camY - arc;

    // small drop shadow on the ground below the projectile
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath();
    ctx.ellipse(curX - camX, curY - camY, 3, 1.5, 0, 0, Math.PI * 2);
    ctx.fill();

    const projSize = Math.max(3, Math.round(TILE * 0.3));
    ctx.fillStyle = BOSS_EDGE;
    ctx.fillRect(px - projSize / 2 - 1, py - projSize / 2 - 1, projSize + 2, projSize + 2);
    ctx.fillStyle = '#ff7a4a';
    ctx.fillRect(px - projSize / 2, py - projSize / 2, projSize, projSize);
  }

  // arrows the player has fired - fly flat and track the target's current position
  for (const p of state.playerProjectiles) {
    const total = p.arriveTime - p.bornTime;
    const progress = Math.min(1, (now - p.bornTime) / total);
    let toX: number;
    let toY: number;
    if (enemies.includes(p.target)) {
      const half = p.target.size === 2 ? TILE : TILE / 2;
      toX = p.target.px + half;
      toY = p.target.py + half;
    } else {
      toX = p.fromX;
      toY = p.fromY;
    }
    const curX = p.fromX + (toX - p.fromX) * progress;
    const curY = p.fromY + (toY - p.fromY) * progress;
    const sx = curX - camX;
    const sy = curY - camY;
    const size = Math.max(3, Math.round(TILE * 0.22));
    ctx.fillStyle = '#4a3220';
    ctx.fillRect(sx - size / 2 - 1, sy - size / 2 - 1, size + 2, size + 2);
    ctx.fillStyle = '#a8794f';
    ctx.fillRect(sx - size / 2, sy - size / 2, size, size);
  }

  if (hoveredTile && hoveredTile.x >= 0 && hoveredTile.y >= 0 && hoveredTile.x < MAP_W && hoveredTile.y < MAP_H) {
    const hx = hoveredTile.x * TILE - camX;
    const hy = hoveredTile.y * TILE - camY;
    const isObstacle = !terrainWalkable(map, hoveredTile.x, hoveredTile.y) || treeBlocksAt(trees, hoveredTile.x, hoveredTile.y);
    ctx.strokeStyle = isObstacle ? '#7a7a82' : '#ffffff';
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

  const grad = ctx.createRadialGradient(canvas.width / 2, canvas.height / 2, canvas.height / 2.2, canvas.width / 2, canvas.height / 2, canvas.height / 1.1);
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
    ctx.fillText('you were struck down...', canvas.width / 2, canvas.height / 2 - 4);
    ctx.font = '6px monospace';
    ctx.fillText('respawning at the threshold', canvas.width / 2, canvas.height / 2 + 5);
  }
}
