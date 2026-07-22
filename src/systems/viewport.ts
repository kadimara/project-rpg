import { TILE, MAP_W, MAP_H } from './world.ts';

// The map is a single fixed-size room, always shown in full - there is no
// camera scroll. The canvas backing store is therefore always exactly the
// map's pixel size; it's scaled uniformly (letterboxed) via CSS to fit
// whatever container it's placed in.
export interface FixedViewportHandle {
  dispose: () => void;
}

export function observeFixedViewport(
  canvas: HTMLCanvasElement,
  container: HTMLElement,
  onResize?: () => void,
): FixedViewportHandle {
  let scheduled = false;
  const recompute = () => {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => {
      scheduled = false;
      const availW = container.clientWidth;
      const availH = container.clientHeight;
      if (availW <= 0 || availH <= 0) return;
      canvas.width = MAP_W * TILE;
      canvas.height = MAP_H * TILE;
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
