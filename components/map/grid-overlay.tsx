"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useDraw, getGridBounds } from "@/lib/draw/draw-context";

// ---------------------------------------------------------------------------
// Grid overlay — diagonal stripe mask outside the simulation area
// ---------------------------------------------------------------------------

export function GridOverlay() {
  const { gridConfig, getMap, ready } = useDraw();
  const containerRef = useRef<HTMLDivElement>(null);
  const [clipPath, setClipPath] = useState<string>("");
  const [gridRect, setGridRect] = useState<{
    left: number;
    top: number;
    width: number;
    height: number;
  } | null>(null);

  const updateOverlay = useCallback(() => {
    const map = getMap();
    const container = containerRef.current;
    if (!map || !container || !gridConfig) return;

    const bounds = getGridBounds(gridConfig);
    const [sw, ne] = bounds;

    // Project geographic corners to screen pixel coordinates
    const swPx = map.project([sw[0], sw[1]]);
    const nePx = map.project([ne[0], ne[1]]);

    const containerRect = container.getBoundingClientRect();
    const W = containerRect.width;
    const H = containerRect.height;

    // Grid rectangle in container coordinates
    const left = swPx.x;
    const top = nePx.y;
    const right = nePx.x;
    const bottom = swPx.y;

    setGridRect({
      left,
      top,
      width: right - left,
      height: bottom - top,
    });

    // CSS clip-path: outer rectangle with inner hole (counter-clockwise)
    setClipPath(
      `polygon(evenodd, 0 0, ${W}px 0, ${W}px ${H}px, 0 ${H}px, 0 0, ${left}px ${top}px, ${left}px ${bottom}px, ${right}px ${bottom}px, ${right}px ${top}px, ${left}px ${top}px)`
    );
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

  return (
    <div
      ref={containerRef}
      className="pointer-events-none absolute inset-0 z-10"
    >
      {clipPath && (
        <>
          {/* Diagonal stripe pattern — background-size approach for clean rendering */}
          <div
            className="absolute inset-0"
            style={{
              clipPath,
              backgroundImage: `repeating-linear-gradient(
                315deg,
                hsl(0 0% 100% / 0.1) 0,
                hsl(0 0% 100% / 0.1) 1px,
                transparent 0,
                transparent 50%
              )`,
              backgroundSize: "10px 10px",
            }}
          />

          {/* Grid border */}
          {gridRect && (
            <div
              className="absolute border-2 border-dashed border-primary/60"
              style={{
                left: gridRect.left,
                top: gridRect.top,
                width: gridRect.width,
                height: gridRect.height,
              }}
            />
          )}

          {/* Crosshair at grid center — same style as pre-placement but accent color */}
          {gridRect && (
            <div
              className="absolute size-8 -translate-x-1/2 -translate-y-1/2"
              style={{
                left: gridRect.left + gridRect.width / 2,
                top: gridRect.top + gridRect.height / 2,
              }}
            >
              <div className="absolute inset-x-0 top-1/2 h-px bg-primary/60" />
              <div className="absolute inset-y-0 left-1/2 w-px bg-primary/60" />
            </div>
          )}
        </>
      )}
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
