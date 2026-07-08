import { TILE_NAMES } from '../systems/world.ts';
import type { TileGrid } from '../types/world.ts';
import type { Player } from '../types/entities.ts';

export interface LegacyPanelsDeps {
  player: Player;
  map: TileGrid;
}

export interface LegacyPanelsHandle {
  isMapOpen: () => boolean;
  updateHud: () => void;
}

export function initLegacyPanels(deps: LegacyPanelsDeps): LegacyPanelsHandle {
  const { player, map } = deps;

  // ---- HUD ----
  const statHp = document.getElementById('stat-hp')!;
  const statPos = document.getElementById('stat-pos')!;
  const statTile = document.getElementById('stat-tile')!;
  const statFacing = document.getElementById('stat-facing')!;
  const statTarget = document.getElementById('stat-target')!;

  function updateHud(): void {
    statHp.textContent = player.health.hp + ' / ' + player.health.maxHp;
    statPos.textContent = player.position.tileX + ', ' + player.position.tileY;
    statTile.textContent = TILE_NAMES[map[player.position.tileY][player.position.tileX]];
    statFacing.textContent = player.movement.dir;
    statTarget.textContent = player.attackTarget ? (player.attackTarget.isBoss ? 'boss (' : 'enemy (') + Math.max(0, player.attackTarget.health.hp) + ' hp)' : 'none';
  }

  // ---- world map toggle ----
  const worldMapOverlay = document.getElementById('world-map-overlay')! as HTMLElement;
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

  return {
    isMapOpen: () => mapOpen,
    updateHud,
  };
}
