# project-rpg

A tiny top-down action RPG that runs in the browser — walk around a generated map, fight enemies and a boss, break barrels. No install, no engine, just a canvas.

## Play

**[kadimara.github.io/project-rpg](https://kadimara.github.io/project-rpg/)**

Works on phone or desktop, right in the browser. Landscape gives you more screen to see the map.

## Controls

**Touch**

- Tap the ground to walk there
- Tap an enemy to attack it

**Mouse / keyboard**

- Click the ground to walk there
- Click an enemy to attack it
- `WASD` or arrow keys also move you
- `M` opens the world map

Attacked enemies chase you until you kill them or they knock you out. Watch for a red ground marker — that's the boss's projectile about to land.

## Running locally

```bash
npm install
npm run dev       # start the dev server
npm run build     # typecheck + production build -> dist/
npm run preview   # preview the production build
```

## Tech

Vanilla TypeScript + Vite, rendered with the raw Canvas 2D API — no game engine, no UI framework.
