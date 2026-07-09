import type { Direction, TileCoord } from '../types/world.ts';

export type WalkableFn = (x: number, y: number) => boolean;
export type GoalFn = (x: number, y: number) => boolean;

// exact-tile BFS, for ground clicks
export function findPath(
  walkable: WalkableFn,
  startX: number,
  startY: number,
  goalX: number,
  goalY: number,
): TileCoord[] {
  if (!walkable(goalX, goalY)) return [];
  if (startX === goalX && startY === goalY) return [];
  const key = (x: number, y: number) => x + ',' + y;
  const visited = new Set([key(startX, startY)]);
  const cameFrom = new Map<string, TileCoord>();
  const queue: TileCoord[] = [{ x: startX, y: startY }];
  let head = 0;
  const dirs = [
    [0, -1],
    [0, 1],
    [-1, 0],
    [1, 0],
  ];
  while (head < queue.length) {
    const cur = queue[head++];
    if (cur.x === goalX && cur.y === goalY) break;
    for (const [dx, dy] of dirs) {
      const nx = cur.x + dx;
      const ny = cur.y + dy;
      const k = key(nx, ny);
      if (visited.has(k)) continue;
      if (!walkable(nx, ny)) continue;
      visited.add(k);
      cameFrom.set(k, cur);
      queue.push({ x: nx, y: ny });
    }
  }
  const goalKey = key(goalX, goalY);
  if (!visited.has(goalKey)) return [];
  const path: TileCoord[] = [];
  let cur: TileCoord | undefined = { x: goalX, y: goalY };
  while (!(cur.x === startX && cur.y === startY)) {
    path.push(cur);
    cur = cameFrom.get(key(cur.x, cur.y));
    if (!cur) return [];
  }
  path.reverse();
  return path;
}

// BFS to nearest tile adjacent to a moving target, for combat chasing
export function bfsChase(
  walkable: WalkableFn,
  startX: number,
  startY: number,
  isGoal: GoalFn,
): TileCoord[] {
  if (isGoal(startX, startY)) return [];
  const key = (x: number, y: number) => x + ',' + y;
  const visited = new Set([key(startX, startY)]);
  const cameFrom = new Map<string, TileCoord>();
  const queue: TileCoord[] = [{ x: startX, y: startY }];
  let head = 0;
  const dirs = [
    [0, -1],
    [0, 1],
    [-1, 0],
    [1, 0],
  ];
  let goalNode: TileCoord | null = null;
  while (head < queue.length && !goalNode) {
    const cur = queue[head++];
    for (const [dx, dy] of dirs) {
      const nx = cur.x + dx;
      const ny = cur.y + dy;
      const k = key(nx, ny);
      if (visited.has(k)) continue;
      if (!walkable(nx, ny)) continue;
      visited.add(k);
      cameFrom.set(k, cur);
      if (isGoal(nx, ny)) {
        goalNode = { x: nx, y: ny };
        break;
      }
      queue.push({ x: nx, y: ny });
    }
  }
  if (!goalNode) return [];
  const path: TileCoord[] = [];
  let cur: TileCoord | undefined = goalNode;
  while (!(cur.x === startX && cur.y === startY)) {
    path.push(cur);
    cur = cameFrom.get(key(cur.x, cur.y));
    if (!cur) return [];
  }
  path.reverse();
  return path;
}

export function dirBetween(
  fromX: number,
  fromY: number,
  toX: number,
  toY: number,
): Direction {
  if (toX > fromX) return 'right';
  if (toX < fromX) return 'left';
  if (toY > fromY) return 'down';
  return 'up';
}

export function tileDist(
  ax: number,
  ay: number,
  bx: number,
  by: number,
): number {
  return Math.abs(ax - bx) + Math.abs(ay - by);
}
