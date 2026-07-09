import type { Barrel, Defender, Enemy, Player } from '../types/entities.ts';

export interface EntityStore {
  entities: Map<string, Defender>;
  playerId: string;
}

export function createEntityStore(
  player: Player,
  others: Defender[] = [],
): EntityStore {
  const entities = new Map<string, Defender>();
  entities.set(player.id, player);
  for (const e of others) entities.set(e.id, e);
  return { entities, playerId: player.id };
}

export function addEntity(store: EntityStore, entity: Defender): void {
  store.entities.set(entity.id, entity);
}

export function removeEntity(store: EntityStore, id: string): void {
  store.entities.delete(id);
}

export function getPlayer(store: EntityStore): Player {
  return store.entities.get(store.playerId) as Player;
}

export function getEnemies(store: EntityStore): Enemy[] {
  const out: Enemy[] = [];
  for (const e of store.entities.values()) if (e.kind === 'enemy') out.push(e);
  return out;
}

export function getBarrels(store: EntityStore): Barrel[] {
  const out: Barrel[] = [];
  for (const e of store.entities.values()) if (e.kind === 'barrel') out.push(e);
  return out;
}
