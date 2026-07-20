export interface CanvasFitOptions {
  logicalWidth: number;
  logicalHeight: number;
}

export function fitCanvasToContainer(
  canvas: HTMLCanvasElement,
  container: HTMLElement,
  { logicalWidth, logicalHeight }: CanvasFitOptions,
): void {
  const availW = container.clientWidth;
  const availH = container.clientHeight;
  if (availW <= 0 || availH <= 0) return;
  const scale = Math.min(availW / logicalWidth, availH / logicalHeight);
  canvas.style.width = `${logicalWidth * scale}px`;
  canvas.style.height = `${logicalHeight * scale}px`;
}

export interface FitHandle {
  recompute: () => void;
  dispose: () => void;
}

export function observeCanvasFit(
  canvas: HTMLCanvasElement,
  container: HTMLElement,
  opts: CanvasFitOptions,
): FitHandle {
  let scheduled = false;
  const recompute = () => {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => {
      scheduled = false;
      fitCanvasToContainer(canvas, container, opts);
    });
  };
  const ro = new ResizeObserver(recompute);
  ro.observe(container);
  window.addEventListener('orientationchange', recompute);
  recompute();
  return {
    recompute,
    dispose: () => {
      ro.disconnect();
      window.removeEventListener('orientationchange', recompute);
    },
  };
}
