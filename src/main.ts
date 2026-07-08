import './style.css';
import { SPAWN_X, SPAWN_Y, buildMap, buildTrees } from './systems/world.ts';
import { createWalkabilityPredicates } from './systems/walkability.ts';
import { createCombatState, createCombatSystem } from './systems/combat.ts';
import { updateEnemies, resolveTelegraphs, resolveProjectiles } from './systems/enemyAI.ts';
import { updatePlayer } from './systems/playerController.ts';
import { createPlayer } from './entities/player.ts';
import { createEnemies, createBoss, enemyAtTile } from './entities/enemies.ts';
import { createKeyboardState } from './input/keyboard.ts';
import { createHoverTracker, createClickHandler } from './input/mouse.ts';
import { getClampedCamX, getClampedCamY } from './render/camera.ts';
import { renderScene } from './render/scene.ts';
import { renderWorldMap } from './render/worldmap.ts';
import { initLegacyPanels } from './ui/legacy-panels.ts';

const canvas = document.getElementById('game') as HTMLCanvasElement;
const ctx = canvas.getContext('2d')!;
ctx.imageSmoothingEnabled = false;

const worldCanvas = document.getElementById('worldmap-canvas') as HTMLCanvasElement;
const worldCtx = worldCanvas.getContext('2d')!;
worldCtx.imageSmoothingEnabled = false;

const map = buildMap();
const trees = buildTrees();
const player = createPlayer(SPAWN_X, SPAWN_Y);
const enemies = createEnemies();
const boss = createBoss();
enemies.push(boss);
const combatState = createCombatState();

const legacy = initLegacyPanels({ player, map, combatState });

const combat = createCombatSystem(combatState, enemies, player, {
  spawnGroundItem: legacy.spawnGroundItem,
  onBossDefeated: legacy.setBossDefeated,
  updateHud: legacy.updateHud,
});

const walkability = createWalkabilityPredicates({
  map,
  trees,
  player,
  enemies,
  isNpcAt: legacy.isNpcAt,
});

const keyboard = createKeyboardState(() => {
  player.path = [];
  player.attackTarget = null;
  player.pickupTarget = null;
  player.talkTarget = null;
});

function getCamera() {
  return { camX: getClampedCamX(player.px), camY: getClampedCamY(player.py) };
}

const hover = createHoverTracker(canvas, getCamera);

createClickHandler(canvas, {
  player,
  enemyAtTile: (x, y) => enemyAtTile(enemies, x, y),
  npcAt: legacy.npcAt,
  groundItemAt: legacy.groundItemAt,
  tryPickupGroundItems: legacy.tryPickupGroundItems,
  interactWithNpc: legacy.interactWithNpc,
  walkable: walkability.walkable,
  getCamera,
});

function tick(now: number): void {
  updatePlayer(player, now, {
    enemies,
    heldDir: keyboard.heldDir,
    walkable: walkability.walkable,
    isPlayerRanged: legacy.isPlayerRanged,
    getPlayerRange: legacy.getPlayerRange,
    attemptAttack: combat.attemptAttack,
    attemptRangedAttack: combat.attemptRangedAttack,
    updateHud: legacy.updateHud,
    tryPickupGroundItems: legacy.tryPickupGroundItems,
    npcAt: legacy.npcAt,
    interactWithNpc: legacy.interactWithNpc,
  });

  updateEnemies(enemies, player, combatState, now, {
    enemyChaseWalkable: walkability.enemyChaseWalkable,
    bossFootprintWalkable: walkability.bossFootprintWalkable,
    attemptAttack: combat.attemptAttack,
    updateHud: legacy.updateHud,
  });

  resolveTelegraphs(combatState, player, now, combat.dealDamageToPlayer);
  resolveProjectiles(combatState, enemies, player, now, combat.applyDamage, legacy.updateHud);

  renderScene(ctx, canvas, now, {
    map,
    trees,
    player,
    enemies,
    npcs: legacy.npcs,
    groundItems: legacy.groundItems,
    state: combatState,
    hoveredTile: hover.hoveredTile,
    getNpcQuestMarker: legacy.getNpcQuestMarker,
  });

  if (legacy.isMapOpen()) {
    renderWorldMap(worldCtx, { map, trees, groundItems: legacy.groundItems, npcs: legacy.npcs, enemies, player });
  }

  requestAnimationFrame(tick);
}

requestAnimationFrame(tick);
