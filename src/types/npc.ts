export type NpcKind = 'quest' | 'shop';

export interface Npc {
  id: string;
  tileX: number;
  tileY: number;
  px: number;
  py: number;
  name: string;
  kind: NpcKind;
  color: string;
  edge: string;
}

export type QuestState = 'not_started' | 'active' | 'completed';
