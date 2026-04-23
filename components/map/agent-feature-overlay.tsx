"use client";

import { useDraw, getGridBounds, type AgentFeatures, type GridConfig } from "@/lib/draw/draw-context";
import { useEffect, useRef, useCallback } from "react";
import type { Map as MapLibreMap } from "maplibre-gl";

// ---------------------------------------------------------------------------
// Colors
// ---------------------------------------------------------------------------

const IGNITION_COLOR = "#FF6B35"; // Orange
const BURN_TEAM_COLOR = "#FFB627"; // Amber
const FUEL_BREAK_COLOR = "#4ECDC4"; // Teal

// ---------------------------------------------------------------------------
// Coordinate conversion: cell (x, y) → canvas pixel
// ---------------------------------------------------------------------------

interface CellToPixelCtx {
  grid: GridConfig;
  map: MapLibreMap;
}

function cellToPixel(
  ctx: CellToPixelCtx,
  x: number,
  y: number,
): { px: number; py: number } | null {
  const [[swLng, swLat], [neLng, neLat]] = getGridBounds(ctx.grid);
  const dim = ctx.grid.cellDimension;

  // Cell (x, y) to geographic coords — x is column (lng), y is row (lat)
  const lng = swLng + ((x + 0.5) / dim) * (neLng - swLng);
  const lat = swLat + ((y + 0.5) / dim) * (neLat - swLat);

  // map.project() returns CSS pixels relative to the map container.
  // The canvas is absolute inset-0 inside the same parent, so the
  // coordinates map directly — no offset subtraction needed.
  const point = ctx.map.project([lng, lat]);
  const dpr = window.devicePixelRatio || 1;

  return { px: point.x * dpr, py: point.y * dpr };
}

// ---------------------------------------------------------------------------
// Drawing
// ---------------------------------------------------------------------------

function drawAgentFeatures(
  canvasEl: HTMLCanvasElement,
  features: AgentFeatures,
  grid: GridConfig,
  map: MapLibreMap,
) {
  const ctx2d = canvasEl.getContext("2d");
  if (!ctx2d) return;

  const dpr = window.devicePixelRatio || 1;
  const rect = canvasEl.getBoundingClientRect();
  canvasEl.width = rect.width * dpr;
  canvasEl.height = rect.height * dpr;
  ctx2d.clearRect(0, 0, canvasEl.width, canvasEl.height);

  const cellCtx: CellToPixelCtx = { grid, map };

  // ── Ignition points ──
  for (const pt of features.ignitions) {
    const p = cellToPixel(cellCtx, pt.x, pt.y);
    if (!p) continue;

    ctx2d.beginPath();
    ctx2d.arc(p.px, p.py, 8 * dpr, 0, Math.PI * 2);
    ctx2d.fillStyle = IGNITION_COLOR;
    ctx2d.fill();

    // White border
    ctx2d.strokeStyle = "#FFFFFF";
    ctx2d.lineWidth = 2 * dpr;
    ctx2d.stroke();
  }

  // ── Burn team paths ──
  ctx2d.strokeStyle = BURN_TEAM_COLOR;
  ctx2d.lineWidth = 3 * dpr;
  ctx2d.setLineDash([8 * dpr, 4 * dpr]);

  for (const team of features.burnTeams) {
    for (const seg of team.segments) {
      const from = cellToPixel(cellCtx, seg.from.x, seg.from.y);
      const to = cellToPixel(cellCtx, seg.to.x, seg.to.y);
      if (!from || !to) continue;

      ctx2d.beginPath();
      ctx2d.moveTo(from.px, from.py);
      ctx2d.lineTo(to.px, to.py);
      ctx2d.stroke();
    }
  }

  // ── Fuel breaks ──
  ctx2d.strokeStyle = FUEL_BREAK_COLOR;
  ctx2d.lineWidth = 4 * dpr;
  ctx2d.setLineDash([]);

  for (const seg of features.fuelBreaks) {
    const from = cellToPixel(cellCtx, seg.x1, seg.y1);
    const to = cellToPixel(cellCtx, seg.x2, seg.y2);
    if (!from || !to) continue;

    ctx2d.beginPath();
    ctx2d.moveTo(from.px, from.py);
    ctx2d.lineTo(to.px, to.py);
    ctx2d.stroke();
  }

  ctx2d.setLineDash([]);
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function AgentFeatureOverlay() {
  const { agentFeatures, gridConfig, getMap } = useDraw();
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const hasFeatures =
    agentFeatures.ignitions.length > 0 ||
    agentFeatures.burnTeams.length > 0 ||
    agentFeatures.fuelBreaks.length > 0;

  const paint = useCallback(() => {
    const canvas = canvasRef.current;
    const map = getMap();
    if (!canvas || !map || !gridConfig || !hasFeatures) {
      if (canvas) {
        const ctx2d = canvas.getContext("2d");
        ctx2d?.clearRect(0, 0, canvas.width, canvas.height);
      }
      return;
    }
    drawAgentFeatures(canvas, agentFeatures, gridConfig, map);
  }, [agentFeatures, gridConfig, getMap, hasFeatures]);

  // Repaint on state change + map move
  useEffect(() => {
    paint();
    const map = getMap();
    if (!map) return;

    map.on("move", paint);
    map.on("zoom", paint);
    map.on("resize", paint);

    return () => {
      map.off("move", paint);
      map.off("zoom", paint);
      map.off("resize", paint);
    };
  }, [paint, getMap]);

  if (!hasFeatures || !gridConfig) return null;

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none absolute inset-0 z-[2]"
      style={{ width: "100%", height: "100%" }}
    />
  );
}
