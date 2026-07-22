import { TILE_NAMES } from '../systems/world.ts';
import type { TileGrid } from '../types/world.ts';
import type { Player } from '../types/entities.ts';

export interface LegacyPanelsDeps {
  player: Player;
  map: TileGrid;
  onUseSlot: (slotIndex: number) => void;
}

export interface LegacyPanelsHandle {
  isMapOpen: () => boolean;
  updateHud: () => void;
  updateActionBar: (now: number) => void;
}

export function initLegacyPanels(deps: LegacyPanelsDeps): LegacyPanelsHandle {
  const { player, map, onUseSlot } = deps;

  // ---- HUD ----
  const statHp = document.getElementById('stat-hp')!;
  const statPos = document.getElementById('stat-pos')!;
  const statTile = document.getElementById('stat-tile')!;
  const statFacing = document.getElementById('stat-facing')!;
  const statTarget = document.getElementById('stat-target')!;

  function updateHud(): void {
    statHp.textContent = player.health.hp + ' / ' + player.health.maxHp;
    statPos.textContent = player.position.tileX + ', ' + player.position.tileY;
    statTile.textContent =
      TILE_NAMES[map[player.position.tileY][player.position.tileX]];
    statFacing.textContent = player.movement.dir;
    statTarget.textContent = player.attackTarget
      ? ('isBoss' in player.attackTarget
          ? player.attackTarget.isBoss
            ? 'boss ('
            : 'enemy ('
          : 'barrel (') +
        Math.max(0, player.attackTarget.health.hp) +
        ' hp)'
      : 'none';
  }

  // ---- action bar ----
  const actionSlotEls = [0, 1, 2, 3].map((i) => ({
    root: document.getElementById('action-slot-' + i)!,
    name: document.getElementById('action-name-' + i)!,
    charges: document.getElementById('action-charges-' + i)!,
  }));

  actionSlotEls.forEach((el, i) => {
    el.root.addEventListener('click', () => onUseSlot(i));
  });

  function updateActionBar(now: number): void {
    player.actionSlots.forEach((item, i) => {
      const el = actionSlotEls[i];
      if (!item) {
        el.name.textContent = 'empty';
        el.charges.textContent = '';
        el.root.classList.remove('on-cooldown');
        return;
      }
      el.name.textContent = item.name;
      el.charges.textContent =
        item.kind === 'potion' ? item.charges + '/' + item.maxCharges : '';
      const onCooldown =
        item.kind === 'melee'
          ? now - player.combat.lastAttack < player.combat.atkCooldown
          : now - item.lastUsed < item.cooldown;
      el.root.classList.toggle('on-cooldown', onCooldown);
    });
  }

  // ---- world map toggle ----
  const worldMapOverlay = document.getElementById(
    'world-map-overlay',
  )! as HTMLElement;
  const worldMapCloseBtn = document.getElementById('world-map-close')!;
  const mapToggleBtn = document.getElementById('map-toggle-btn')!;
  let mapOpen = false;
  function setMapOpen(v: boolean): void {
    mapOpen = v;
    worldMapOverlay.style.display = v ? 'flex' : 'none';
  }
  mapToggleBtn.addEventListener('click', () => setMapOpen(!mapOpen));
  worldMapCloseBtn.addEventListener('click', () => setMapOpen(false));

  window.addEventListener('keydown', (e) => {
    if (e.key === 'm' || e.key === 'M') setMapOpen(!mapOpen);
    if (e.key === 'Escape') setMapOpen(false);
  });

  updateHud();
  updateActionBar(0);

  return {
    isMapOpen: () => mapOpen,
    updateHud,
    updateActionBar,
  };
}
