"use client";

import { useEffect, useRef, useCallback } from "react";
import { useDraw, getGridBounds } from "@/lib/draw/draw-context";
import type { CellOperation } from "@/lib/devs-fire/types";

// ---------------------------------------------------------------------------
// Color palette: burn time → color
// ---------------------------------------------------------------------------

/** Interpolate from yellow → orange → red → crimson based on normalized time [0,1]. */
function burnColor(t: number): string {
  // Yellow(60,100%,50%) → Orange(30,100%,50%) → Red(0,100%,45%) → Crimson(345,90%,30%)
  if (t < 0.33) {
    const p = t / 0.33;
    const h = 60 - p * 30; // 60 → 30
    return `hsla(${h}, 100%, 50%, 0.7)`;
  }
  if (t < 0.66) {
    const p = (t - 0.33) / 0.33;
    const h = 30 - p * 30; // 30 → 0
    const l = 50 - p * 5;  // 50 → 45
    return `hsla(${h}, 100%, ${l}%, 0.75)`;
  }
  const p = (t - 0.66) / 0.34;
  const h = 360 - p * 15; // 0/360 → 345
  const s = 100 - p * 10; // 100 → 90
  const l = 45 - p * 15;  // 45 → 30
  return `hsla(${h}, ${s}%, ${l}%, 0.8)`;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function SimulationOverlay() {
  const { gridConfig, simulationCells, playbackTime, getMap, ready } = useDraw();
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const renderFrame = useCallback(() => {
    const canvas = canvasRef.current;
    const map = getMap();
    if (!canvas || !map || !gridConfig || !simulationCells) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Match canvas resolution to container
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    ctx.clearRect(0, 0, rect.width, rect.height);

    // Pre-compute: filter cells up to playback time & find time range
    const visibleCells: CellOperation[] = [];
    let minTime = Infinity;
    let maxTime = -Infinity;

    for (const cell of simulationCells) {
      const cellTime = parseFloat(cell.time);
      if (cellTime <= playbackTime) {
        visibleCells.push(cell);
        minTime = Math.min(minTime, cellTime);
        maxTime = Math.max(maxTime, cellTime);
      }
    }

    if (visibleCells.length === 0) return;

    const timeRange = maxTime - minTime || 1;

    // Grid geometry
    const bounds = getGridBounds(gridConfig);
    const [sw, ne] = bounds;
    const dim = gridConfig.cellDimension;

    // Screen pixel positions of grid corners
    const swPx = map.project([sw[0], sw[1]]);
    const nePx = map.project([ne[0], ne[1]]);

    // Cell size in screen pixels
    const cellW = (nePx.x - swPx.x) / dim;
    const cellH = (swPx.y - nePx.y) / dim;

    // Skip rendering if cells are sub-pixel
    if (cellW < 0.5 || cellH < 0.5) return;

    // Render each cell
    for (const cell of visibleCells) {
      const cx = parseInt(cell.x, 10);
      const cy = parseInt(cell.y, 10);
      const cellTime = parseFloat(cell.time);

      // Normalized time for color
      const t = (cellTime - minTime) / timeRange;

      // Screen position: x increases east, y increases north (but screen y is inverted)
      const screenX = swPx.x + cx * cellW;
      const screenY = nePx.y + (dim - 1 - cy) * cellH;

      ctx.fillStyle = burnColor(t);
      ctx.fillRect(screenX, screenY, Math.ceil(cellW), Math.ceil(cellH));
    }
  }, [gridConfig, simulationCells, playbackTime, getMap]);

  // Re-render on map move/zoom and playback time changes
  useEffect(() => {
    if (!ready || !simulationCells) return;
    const map = getMap();
    if (!map) return;

    renderFrame();

    map.on("move", renderFrame);
    map.on("resize", renderFrame);

    return () => {
      map.off("move", renderFrame);
      map.off("resize", renderFrame);
    };
  }, [ready, simulationCells, renderFrame, getMap]);

  // Also re-render when playback time changes
  useEffect(() => {
    renderFrame();
  }, [playbackTime, renderFrame]);

  if (!simulationCells || !gridConfig) return null;

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none absolute inset-0 z-15"
      style={{ width: "100%", height: "100%" }}
    />
  );
}
