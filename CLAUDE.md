# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A tiny top-down action RPG that renders to an HTML5 `<canvas>` using the raw Canvas 2D API — no game engine, no UI framework. Vanilla TypeScript + Vite. You walk around a single generated map, fight enemies and a boss, and break barrels; on death you respawn at the spawn point. The whole game boots from `src/main.ts` and runs on `requestAnimationFrame`.

## Commands

```bash
npm run dev            # start Vite dev server
npm run build           # tsc typecheck (noEmit) + vite build -> dist/
npm run preview         # preview the production build
npm run format           # prettier --write .
npm run format:check     # prettier --check .
```

There is no test suite and no linter configured — `npm run build` (which runs `tsc`) is the only automated correctness check. Prettier config is just `{ "singleQuote": true }` (`.prettierrc.json`).

Deploys automatically via `.github/workflows/deploy.yml` on every push to `main` (build + publish `dist/` to GitHub Pages). `vite.config.ts` sets `base: "/project-rpg/"` to match the Pages URL — keep that in sync if the repo is ever renamed.

## TypeScript conventions

- Imports use explicit `.ts` extensions (`allowImportingTsExtensions` + `noEmit`/bundler resolution) — always write `from './foo.ts'`, not `from './foo'`.
- `verbatimModuleSyntax` is on: type-only imports must use `import type { ... }`, not a plain `import`.
- `noUnusedLocals`/`noUnusedParameters`/`noFallthroughCasesInSwitch` are enforced by `tsc` — the build fails on them.
- No `any`-heavy or class-based code in this codebase; everything is plain functions operating on plain data objects (see Architecture below). Follow that style rather than introducing classes.

## Architecture

The codebase is data-oriented: game entities are plain objects made of small composable trait interfaces, and behavior lives in standalone functions grouped by folder, wired together only in `main.ts`.

**`src/types/`** — shared interfaces, no logic.

- `entities.ts` defines trait interfaces (`Position`, `Movement`, `Health`, `Combat`) that `Player`, `Enemy`, and `Barrel` compose via `extends`, not inheritance hierarchies. `Combatant = Player | Enemy` (things that can attack), `Defender = Player | Enemy | Barrel` (things that can be attacked).
- `world.ts` / `combat.ts` define the tile grid types and combat-effect types (telegraphs, floating damage text).

**`src/entities/`** — factories and per-kind helpers (`createPlayer`, `createEnemies`, `createBoss`, `createBarrels`), plus:

- `store.ts` — `EntityStore` is a `Map<id, Defender>` holding the player + all enemies + all barrels together; read via `getPlayer`/`getEnemies`/`getBarrels`. This is the single source of truth for "what's alive right now" — enemies/barrels are removed from this map on death, not just hidden.
- `actor.ts` — shared movement/animation stepping (`startStep`, `updateActorAnimation`) used by both the player and enemies.
- `footprint.ts` — generalizes 1x1 vs 2x2 (boss) actors into a list of occupied tiles, so walkability/adjacency/targeting code doesn't need separate boss-sized branches.

**`src/systems/`** — the actual gameplay logic, as functions that take the relevant entities plus a `deps` object of callbacks/predicates (not singletons or globals). Notably:

- `world.ts` — map generation/constants (`TILE`, `MAP_W/H`, `SPAWN_X/Y`) and terrain walkability.
- `viewport.ts` — the map is a single fixed-size 8x8 room shown in full at all times (no camera scroll), so `observeFixedViewport` just sets the game canvas's backing store to the map's exact pixel size (`MAP_W/H * TILE`) and scales it uniformly via CSS (letterboxed) to fit whatever container it's placed in; `canvas.width`/`canvas.height` are still the live source of truth for viewport size, consumed directly by `camera.ts`/`scene.ts`.
- `walkability.ts` — builds the `walkable` / `enemyChaseWalkable` / `bossFootprintWalkable` predicate functions once (closing over map/trees/store), then hands them down as deps to player/enemy controllers.
- `pathfinding.ts` — plain BFS (`findPath` for exact-tile clicks, `bfsChase` for "get adjacent to a moving target").
- `playerController.ts` / `enemyAI.ts` — per-frame decision logic (move along path, chase, attack when adjacent). All enemy attacks are telegraphed: regular enemies queue a short melee wind-up (`state.telegraphs`) on the player's tile when they land a hit, and the boss additionally telegraphs its ranged special the same way; both kinds land after a delay, resolved uniformly by `resolveTelegraphs`.
- `combat.ts` — `applyDamage`/`attemptAttack`, cooldown-gated, spawns floating damage numbers and triggers aggro/death.
- `death.ts` — respawns the player or removes the entity from the `EntityStore` and clears it as the player's attack target.

**`src/render/`** — pure drawing functions; no game state is mutated here. `scene.ts` is the main per-frame draw: tile layer, then a **painter's-algorithm sort by `footY`** (bottom edge of each actor/tree) so nearer objects draw over farther ones — this is what makes a character walk behind a tree's canopy correctly. `worldmap.ts` draws the minimap overlay the same way at a different tile size.

**`src/input/`** — `keyboard.ts` polls currently-held movement keys per frame; `mouse.ts` converts clicks to tile coordinates and resolves them to either "attack this entity" or "path to this tile" (via `findPath`).

**`src/ui/legacy-panels.ts`** — the only DOM-touching game code: updates the HUD stat spans and the world-map toggle overlay defined in `index.html` directly via `getElementById`.

**`src/main.ts`** is the composition root: it constructs the map, entities, `EntityStore`, combat state, and walkability predicates, then wires them into the closures passed to `updatePlayer`/`updateEnemies`/`resolveTelegraphs`/`renderScene` inside the `tick()` loop. Systems never import each other's game state directly — cross-system calls (e.g. enemyAI needing to attack the player) go through deps objects assembled here.

### Coordinate systems

Three coordinate spaces are used throughout — keep them straight when touching movement/rendering code:

- **Tile coords** (`tileX`/`tileY`): integer grid position.
- **World pixel coords** (`px`/`py`): `tile * TILE` (TILE = 16), used for smooth movement interpolation (`fromX/fromY/toX/toY` + `moveStart/moveDur` in `Movement`).
- **Screen coords** (`sx`/`sy`): world pixels minus the camera offset (`getClampedCamX/Y`), used only in `render/`.

Movement is tile-stepped, not free-form: an actor commits to a destination tile (`startStep`) and animates `px/py` toward it over `moveDur` ms (`updateActorAnimation`); it can't be interrupted mid-step.

The canvas itself is tiny (128x128 — the whole 8x8 map at `TILE=16`px) and scaled up via CSS in `index.html` for a pixel-art look — `ctx.imageSmoothingEnabled = false` is required to keep edges crisp.
