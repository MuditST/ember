"use client";

import { useCallback, useEffect, useState } from "react";
import Map, { NavigationControl } from "react-map-gl/maplibre";
import { useTheme } from "next-themes";
import "maplibre-gl/dist/maplibre-gl.css";

// ---------------------------------------------------------------------------
// MapTiler style URLs
// ---------------------------------------------------------------------------

const MAPTILER_KEY = process.env.NEXT_PUBLIC_MAPTILER_KEY ?? "";

const STYLES = {
  "dataviz-dark": `https://api.maptiler.com/maps/dataviz-dark/style.json?key=${MAPTILER_KEY}`,
  "dataviz-light": `https://api.maptiler.com/maps/dataviz-light/style.json?key=${MAPTILER_KEY}`,
  satellite: `https://api.maptiler.com/maps/hybrid/style.json?key=${MAPTILER_KEY}`,
} as const;

export type MapStyleKey = keyof typeof STYLES;

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface FireMapProps {
  /** Override the auto-detected style (e.g. user toggles satellite). */
  styleOverride?: MapStyleKey | null;
}

export function FireMap({ styleOverride }: FireMapProps) {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Avoid hydration mismatch — only render after mount
  useEffect(() => setMounted(true), []);

  // Determine which tile style to use
  const autoStyle: MapStyleKey =
    resolvedTheme === "light" ? "dataviz-light" : "dataviz-dark";
  const activeStyle = styleOverride ?? autoStyle;

  // Show nothing during SSR / initial hydration
  if (!mounted) {
    return <div className="size-full bg-background" />;
  }

  return (
    <Map
      initialViewState={{
        longitude: -98.5,
        latitude: 39.8,
        zoom: 4,
      }}
      mapStyle={STYLES[activeStyle]}
      style={{ width: "100%", height: "100%" }}
      attributionControl={false}
    >
      <NavigationControl position="bottom-right" showCompass visualizePitch />
    </Map>
  );
}

export { STYLES };
