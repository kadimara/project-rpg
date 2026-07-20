import { TILE, MAP_W, MAP_H } from './world.ts';

// Preserves the original 13x9 = 117 tile "zoom level" while reshaping the
// viewport to the container's aspect ratio. Clamped so the camera always
// keeps room to scroll within the map (24x18 tiles) instead of the viewport
// ever needing to be as large as the map itself.
const REFERENCE_AREA = 13 * 9;
const MIN_VP_TILES = 8;
const MARGIN_TILES = 4;

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

function computeViewportTiles(
  containerW: number,
  containerH: number,
): { vpW: number; vpH: number } {
  const aspect = containerW / containerH;
  const vpW = clamp(
    Math.round(Math.sqrt(REFERENCE_AREA * aspect)),
    MIN_VP_TILES,
    MAP_W - MARGIN_TILES,
  );
  const vpH = clamp(
    Math.round(Math.sqrt(REFERENCE_AREA / aspect)),
    MIN_VP_TILES,
    MAP_H - MARGIN_TILES,
  );
  return { vpW, vpH };
}

export interface AdaptiveViewportHandle {
  dispose: () => void;
}

export function observeAdaptiveViewport(
  canvas: HTMLCanvasElement,
  container: HTMLElement,
  onResize?: () => void,
): AdaptiveViewportHandle {
  let scheduled = false;
  const recompute = () => {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => {
      scheduled = false;
      const availW = container.clientWidth;
      const availH = container.clientHeight;
      if (availW <= 0 || availH <= 0) return;
      const { vpW, vpH } = computeViewportTiles(availW, availH);
      canvas.width = vpW * TILE;
      canvas.height = vpH * TILE;
      const scale = Math.min(availW / canvas.width, availH / canvas.height);
      canvas.style.width = `${canvas.width * scale}px`;
      canvas.style.height = `${canvas.height * scale}px`;
      onResize?.();
    });
  };
  const ro = new ResizeObserver(recompute);
  ro.observe(container);
  window.addEventListener('orientationchange', recompute);
  recompute();
  return {
    dispose: () => {
      ro.disconnect();
      window.removeEventListener('orientationchange', recompute);
    },
  };
}
