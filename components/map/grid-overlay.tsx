"use client";

import { useEffect, useRef, useCallback } from "react";
import { useTheme } from "next-themes";
import { useDraw, getGridBounds } from "@/lib/draw/draw-context";

// ---------------------------------------------------------------------------
// Grid overlay — diagonal stripe mask outside the simulation area
// ---------------------------------------------------------------------------

interface GridOverlayProps {
  /** Whether the map is showing satellite imagery */
  isSatellite?: boolean;
}

export function GridOverlay({ isSatellite = false }: GridOverlayProps) {
  const { gridConfig, getMap, ready } = useDraw();
  const { resolvedTheme } = useTheme();
  const containerRef = useRef<HTMLDivElement>(null);
  const tintRef = useRef<HTMLDivElement>(null);
  const maskRef = useRef<HTMLDivElement>(null);
  const borderRef = useRef<HTMLDivElement>(null);
  const crosshairRef = useRef<HTMLDivElement>(null);

  // Paint directly into DOM refs — avoids setState inside a map event
  // callback, which was the source of the infinite update loop.
  const updateOverlay = useCallback(() => {
    const map = getMap();
    const container = containerRef.current;
    if (!map || !container || !gridConfig) return;

    const bounds = getGridBounds(gridConfig);
    const [sw, ne] = bounds;

    const swPx = map.project([sw[0], sw[1]]);
    const nePx = map.project([ne[0], ne[1]]);

    const containerRect = container.getBoundingClientRect();
    const W = containerRect.width;
    const H = containerRect.height;

    const left = swPx.x;
    const top = nePx.y;
    const right = nePx.x;
    const bottom = swPx.y;
    const width = right - left;
    const height = bottom - top;

    const clip = `polygon(evenodd, 0 0, ${W}px 0, ${W}px ${H}px, 0 ${H}px, 0 0, ${left}px ${top}px, ${left}px ${bottom}px, ${right}px ${bottom}px, ${right}px ${top}px, ${left}px ${top}px)`;

    // Tint overlay (satellite mode)
    if (tintRef.current) {
      tintRef.current.style.clipPath = clip;
    }

    // Stripe mask
    if (maskRef.current) {
      maskRef.current.style.clipPath = clip;
    }

    // Border
    if (borderRef.current) {
      borderRef.current.style.left = `${left}px`;
      borderRef.current.style.top = `${top}px`;
      borderRef.current.style.width = `${width}px`;
      borderRef.current.style.height = `${height}px`;
    }

    // Crosshair
    if (crosshairRef.current) {
      crosshairRef.current.style.left = `${left + width / 2}px`;
      crosshairRef.current.style.top = `${top + height / 2}px`;
    }
  }, [gridConfig, getMap]);

  useEffect(() => {
    if (!ready || !gridConfig) return;
    const map = getMap();
    if (!map) return;

    requestAnimationFrame(updateOverlay);

    map.on("move", updateOverlay);
    map.on("resize", updateOverlay);

    return () => {
      map.off("move", updateOverlay);
      map.off("resize", updateOverlay);
    };
  }, [ready, gridConfig, getMap, updateOverlay]);

  if (!gridConfig) return null;

  // Theme-aware stripe color: dark stripes for light mode, light stripes for dark mode
  const isDark = resolvedTheme === "dark" || isSatellite;
  const stripeColor = isDark
    ? "hsl(0 0% 100% / 0.08)"
    : "hsl(0 0% 0% / 0.08)";

  return (
    <div
      ref={containerRef}
      className="pointer-events-none absolute inset-0 z-10"
    >
      {/* Dark tint for satellite mode — makes the grid area pop */}
      {isSatellite && (
        <div
          ref={tintRef}
          className="absolute inset-0 bg-black/40"
        />
      )}

      {/* Diagonal stripe pattern — theme-aware color */}
      <div
        ref={maskRef}
        className="absolute inset-0"
        style={{
          backgroundImage: `repeating-linear-gradient(
            315deg,
            ${stripeColor} 0,
            ${stripeColor} 1px,
            transparent 0,
            transparent 50%
          )`,
          backgroundSize: "10px 10px",
        }}
      />

      {/* Grid border */}
      <div
        ref={borderRef}
        className="absolute border-2 border-dashed border-primary/60"
      />

      {/* Crosshair at grid center */}
      <div
        ref={crosshairRef}
        className="absolute size-8 -translate-x-1/2 -translate-y-1/2"
      >
        <div className="absolute inset-x-0 top-1/2 h-px bg-primary/60" />
        <div className="absolute inset-y-0 left-1/2 w-px bg-primary/60" />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Crosshair — shows at map center before grid is placed
// ---------------------------------------------------------------------------

export function MapCrosshair() {
  const { gridConfig, ready } = useDraw();

  if (!ready || gridConfig) return null;

  return (
    <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center">
      <div className="relative size-8">
        <div className="absolute inset-x-0 top-1/2 h-px bg-foreground/30" />
        <div className="absolute inset-y-0 left-1/2 w-px bg-foreground/30" />
      </div>
    </div>
  );
}
