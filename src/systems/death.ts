import type { Defender } from '../types/entities.ts';
import type { CombatState } from '../types/combat.ts';
import {
  getPlayer,
  removeEntity,
  type EntityStore,
} from '../entities/store.ts';
import { respawnPlayer } from '../entities/player.ts';

// Resolves what happens when an entity's health drops to zero: the player
// respawns at the spawn point, everything else is removed from the world.
export function handleEntityDeath(
  store: EntityStore,
  state: CombatState,
  defender: Defender,
  now: number,
): void {
  if (defender.kind === 'player') {
    respawnPlayer(store, state, now);
    return;
  }
  removeEntity(store, defender.id);
  const player = getPlayer(store);
  if (player.attackTarget === defender) {
    player.attackTarget = null;
    player.movement.path = [];
  }
}
