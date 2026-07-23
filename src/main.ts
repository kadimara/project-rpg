import './style.css';
import { SPAWN_X, SPAWN_Y, buildMap, buildTrees } from './systems/world.ts';
import { createWalkabilityPredicates } from './systems/walkability.ts';
import { observeFixedViewport } from './systems/viewport.ts';
import {
  createCombatState,
  attemptAttack,
  type CombatContext,
  applyDamage,
} from './systems/combat.ts';
import { updateEnemies, resolveTelegraphs } from './systems/enemyAI.ts';
import { updatePlayer } from './systems/playerController.ts';
import {
  useSlot,
  resolveBombThrows,
  tryStartBombAim,
  throwBomb,
  type ItemContext,
} from './systems/items.ts';
import { createGameClock } from './systems/pauseClock.ts';
import { handleEntityDeath } from './systems/death.ts';
import { createPlayer } from './entities/player.ts';
import { createEnemies, createBoss, enemyAtTile } from './entities/enemies.ts';
import { createBarrels, barrelAtTile } from './entities/barrels.ts';
import { createEntityStore, getBarrels, getEnemies } from './entities/store.ts';
import { createKeyboardState } from './input/keyboard.ts';
import { createHoverTracker, createClickHandler } from './input/mouse.ts';
import { getClampedCamX, getClampedCamY } from './render/camera.ts';
import { renderScene } from './render/scene.ts';
import { renderWorldMap } from './render/worldmap.ts';
import { initLegacyPanels } from './ui/legacy-panels.ts';
import type { BombItem } from './types/items.ts';

const canvas = document.getElementById('game') as HTMLCanvasElement;
const ctx = canvas.getContext('2d')!;
ctx.imageSmoothingEnabled = false;

const worldCanvas = document.getElementById(
  'worldmap-canvas',
) as HTMLCanvasElement;
const worldCtx = worldCanvas.getContext('2d')!;
worldCtx.imageSmoothingEnabled = false;

observeFixedViewport(canvas, canvas.parentElement!, () => {
  ctx.imageSmoothingEnabled = false;
});

const map = buildMap();
const trees = buildTrees();
const player = createPlayer(SPAWN_X, SPAWN_Y);
const enemies = createEnemies();
enemies.push(createBoss());
const barrels = createBarrels();
const store = createEntityStore(player, [...enemies, ...barrels]);
const combatState = createCombatState();

// the virtual game clock: freezes while paused so movement/cooldowns/telegraphs
// (all of which just take `now` as a parameter) resume exactly where they left
// off, without any of them needing to know pause exists
const clock = createGameClock();

// index of the bomb slot currently being aimed, or null when not aiming
let aimSlot: number | null = null;

const legacy = initLegacyPanels({
  player,
  map,
  // itemCtx and tryEnterAim are declared further below, but initLegacyPanels
  // only ever stores this closure as a click-listener callback - it never
  // invokes it during construction - so by the time a tap actually fires, both
  // are long since assigned/hoisted. Do not make initLegacyPanels call
  // onUseSlot synchronously.
  onUseSlot: (i) => {
    const item = player.actionSlots[i];
    if (item?.kind === 'bomb') {
      tryEnterAim(i);
    } else {
      useSlot(itemCtx, player, i, clock.now(performance.now()));
    }
  },
});

const combatCtx: CombatContext = {
  state: combatState,
  store,
  onDeath: (defender, now) =>
    handleEntityDeath(store, combatState, defender, now),
};

const walkability = createWalkabilityPredicates({
  map,
  trees,
  player,
  store,
});

const itemCtx: ItemContext = {
  combatCtx,
  store,
  updateHud: legacy.updateHud,
};

// starts aiming the given bomb slot (pausing the game) if it's off cooldown;
// no-op if already aiming or the slot can't be aimed right now
function tryEnterAim(slotIndex: number): void {
  if (aimSlot !== null) return;
  const item = player.actionSlots[slotIndex];
  if (!tryStartBombAim(item, clock.now(performance.now()))) return;
  aimSlot = slotIndex;
  clock.pause(performance.now());
}

const keyboard = createKeyboardState(
  () => {
    player.movement.path = [];
    player.attackTarget = null;
  },
  (slotIndex) => tryEnterAim(slotIndex),
);

function getCamera() {
  return {
    camX: getClampedCamX(player.position.px, canvas.width),
    camY: getClampedCamY(player.position.py, canvas.height),
  };
}

const hover = createHoverTracker(canvas, getCamera);

createClickHandler(canvas, {
  player,
  enemyAtTile: (x, y) => enemyAtTile(getEnemies(store), x, y),
  barrelAtTile: (x, y) => barrelAtTile(getBarrels(store), x, y),
  walkable: walkability.walkable,
  getCamera,
  isAiming: () => aimSlot !== null,
  onAimPress: (tile) => {
    const item = player.actionSlots[aimSlot!] as BombItem;
    throwBomb(
      itemCtx,
      player,
      item,
      clock.now(performance.now()),
      tile.x,
      tile.y,
    );
    aimSlot = null;
    clock.resume(performance.now());
  },
  onPressStart: () => clock.pause(performance.now()),
  onPressEnd: () => clock.resume(performance.now()),
});

function tick(realNow: number): void {
  const paused = clock.isPaused();
  const now = clock.now(realNow);

  if (!paused) {
    updatePlayer(player, now, {
      store,
      heldDir: keyboard.heldDir,
      walkable: walkability.walkable,
      attemptAttack: (attacker, defender, t) =>
        attemptAttack(combatCtx, attacker, defender, t),
      updateHud: legacy.updateHud,
    });

    updateEnemies(getEnemies(store), player, combatState, now, {
      enemyChaseWalkable: walkability.enemyChaseWalkable,
      bossFootprintWalkable: walkability.bossFootprintWalkable,
    });

    for (let i = 0; i < 4; i++) {
      if (keyboard.heldActionSlot(i)) useSlot(itemCtx, player, i, now);
    }

    resolveTelegraphs(combatState, player, now, (dmg, t) => {
      applyDamage(combatCtx, player, dmg, t);
      legacy.updateHud();
    });
    resolveBombThrows(combatState, store, combatCtx, now);
  }

  renderScene(ctx, canvas, now, {
    map,
    trees,
    player,
    enemies: getEnemies(store),
    barrels: getBarrels(store),
    state: combatState,
    hoveredTile: hover.hoveredTile,
    aiming: aimSlot !== null,
  });

  legacy.updateActionBar(now);

  if (legacy.isMapOpen()) {
    renderWorldMap(worldCtx, {
      map,
      trees,
      enemies: getEnemies(store),
      barrels: getBarrels(store),
      player,
    });
  }

  requestAnimationFrame(tick);
}

requestAnimationFrame(tick);
