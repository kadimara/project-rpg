import './style.css';
import { SPAWN_X, SPAWN_Y, buildMap, buildTrees } from './systems/world.ts';
import { createWalkabilityPredicates } from './systems/walkability.ts';
import {
  createCombatState,
  attemptAttack,
  dealDamageToPlayer,
  type CombatContext,
} from './systems/combat.ts';
import { updateEnemies, resolveTelegraphs } from './systems/enemyAI.ts';
import { updatePlayer } from './systems/playerController.ts';
import { createPlayer } from './entities/player.ts';
import { createEnemies, createBoss, enemyAtTile } from './entities/enemies.ts';
import { createBarrels, barrelAtTile } from './entities/barrels.ts';
import { createKeyboardState } from './input/keyboard.ts';
import { createHoverTracker, createClickHandler } from './input/mouse.ts';
import { getClampedCamX, getClampedCamY } from './render/camera.ts';
import { renderScene } from './render/scene.ts';
import { renderWorldMap } from './render/worldmap.ts';
import { initLegacyPanels } from './ui/legacy-panels.ts';

const canvas = document.getElementById('game') as HTMLCanvasElement;
const ctx = canvas.getContext('2d')!;
ctx.imageSmoothingEnabled = false;

const worldCanvas = document.getElementById(
  'worldmap-canvas',
) as HTMLCanvasElement;
const worldCtx = worldCanvas.getContext('2d')!;
worldCtx.imageSmoothingEnabled = false;

const map = buildMap();
const trees = buildTrees();
const player = createPlayer(SPAWN_X, SPAWN_Y);
const enemies = createEnemies();
const boss = createBoss();
enemies.push(boss);
const barrels = createBarrels();
const combatState = createCombatState();

const legacy = initLegacyPanels({ player, map });

const combatCtx: CombatContext = {
  state: combatState,
  enemies,
  barrels,
  player,
};

const walkability = createWalkabilityPredicates({
  map,
  trees,
  player,
  enemies,
  barrels,
});

const keyboard = createKeyboardState(() => {
  player.movement.path = [];
  player.attackTarget = null;
});

function getCamera() {
  return {
    camX: getClampedCamX(player.position.px),
    camY: getClampedCamY(player.position.py),
  };
}

const hover = createHoverTracker(canvas, getCamera);

createClickHandler(canvas, {
  player,
  enemyAtTile: (x, y) => enemyAtTile(enemies, x, y),
  barrelAtTile: (x, y) => barrelAtTile(barrels, x, y),
  walkable: walkability.walkable,
  getCamera,
});

function tick(now: number): void {
  updatePlayer(player, now, {
    enemies,
    barrels,
    heldDir: keyboard.heldDir,
    walkable: walkability.walkable,
    attemptAttack: (attacker, defender, t) =>
      attemptAttack(combatCtx, attacker, defender, t),
    updateHud: legacy.updateHud,
  });

  updateEnemies(enemies, player, combatState, now, {
    enemyChaseWalkable: walkability.enemyChaseWalkable,
    bossFootprintWalkable: walkability.bossFootprintWalkable,
    attemptAttack: (attacker, defender, t) =>
      attemptAttack(combatCtx, attacker, defender, t),
    updateHud: legacy.updateHud,
  });

  resolveTelegraphs(combatState, player, now, (dmg, t) =>
    dealDamageToPlayer(combatCtx, dmg, t, legacy.updateHud),
  );

  renderScene(ctx, canvas, now, {
    map,
    trees,
    player,
    enemies,
    barrels,
    state: combatState,
    hoveredTile: hover.hoveredTile,
  });

  if (legacy.isMapOpen()) {
    renderWorldMap(worldCtx, { map, trees, enemies, barrels, player });
  }

  requestAnimationFrame(tick);
}

requestAnimationFrame(tick);
