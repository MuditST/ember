"use client";

import { Map, Satellite } from "lucide-react";
import { cn } from "@/lib/utils";
import type { MapStyleKey } from "./fire-map";

interface StyleSwitcherProps {
  activeStyle: MapStyleKey | null;
  onStyleChange: (style: MapStyleKey | null) => void;
  className?: string;
}

/**
 * Small floating toggle for switching between dataviz (theme-aware)
 * and satellite map tiles. Positioned absolutely in the map panel.
 */
export function StyleSwitcher({
  activeStyle,
  onStyleChange,
  className,
}: StyleSwitcherProps) {
  const isSatellite = activeStyle === "satellite";

  return (
    <div
      className={cn(
        "flex items-center gap-1 rounded-xl border bg-background/80 px-1.5 py-1.5 shadow-lg backdrop-blur-sm",
        className
      )}
    >
      <button
        onClick={() => onStyleChange(null)}
        className={cn(
          "flex items-center rounded-lg px-2.5 py-2 transition-colors",
          !isSatellite
            ? "bg-primary text-primary-foreground"
            : "text-muted-foreground hover:text-foreground"
        )}
        title="Map view (theme-aware)"
      >
        <Map className="size-4" />
      </button>
      <button
        onClick={() => onStyleChange("satellite")}
        className={cn(
          "flex items-center rounded-lg px-2.5 py-2 transition-colors",
          isSatellite
            ? "bg-primary text-primary-foreground"
            : "text-muted-foreground hover:text-foreground"
        )}
        title="Satellite view"
      >
        <Satellite className="size-4" />
      </button>
    </div>
  );
}
