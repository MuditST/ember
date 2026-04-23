"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  TerraDraw,
  TerraDrawPointMode,
  TerraDrawLineStringMode,
  TerraDrawSelectMode,
  TerraDrawRenderMode,
  type GeoJSONStoreFeatures,
} from "terra-draw";
import { TerraDrawMapLibreGLAdapter } from "terra-draw-maplibre-gl-adapter";
import type { Map as MapLibreMap } from "maplibre-gl";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type DrawMode = "ignition" | "burn-path" | "fuel-break";

export interface DrawnIgnition {
  id: string;
  lng: number;
  lat: number;
}

export interface DrawnLine {
  id: string;
  coords: [number, number][];
}

export interface DrawnFeatures {
  ignitions: DrawnIgnition[];
  burnPaths: DrawnLine[];
  fuelBreaks: DrawnLine[];
}

/** Grid configuration for the simulation area. */
export interface GridConfig {
  /** Center latitude */
  lat: number;
  /** Center longitude */
  lng: number;
  /** Cell size in meters (2–30) */
  cellResolution: number;
  /** Cells per side (50–200) */
  cellDimension: number;
}

/** Compute the grid side length in meters. */
export function getGridSideMeters(config: GridConfig): number {
  return config.cellDimension * config.cellResolution;
}

/** Compute the bounding box [sw, ne] for a grid config. */
export function getGridBounds(
  config: GridConfig
): [[number, number], [number, number]] {
  const halfM = getGridSideMeters(config) / 2;
  const dLat = halfM / 111320;
  const dLng = halfM / (111320 * Math.cos((config.lat * Math.PI) / 180));
  return [
    [config.lng - dLng, config.lat - dLat], // SW
    [config.lng + dLng, config.lat + dLat], // NE
  ];
}

export interface DrawContextValue {
  /** Whether Terra Draw is attached and ready */
  ready: boolean;
  /** Current active drawing mode (null = pan/zoom) */
  activeMode: DrawMode | null;
  /** Switch drawing mode. Pass null to return to pan. */
  setMode: (mode: DrawMode | null) => void;
  /** All drawn features, grouped by type */
  features: DrawnFeatures;
  /** Remove a drawn feature by id */
  removeFeature: (id: string) => void;
  /** Clear drawn features only (points, lines, breaks) */
  clearDrawings: () => void;
  /** Attach to a MapLibre map instance. Call once on map load. */
  attachMap: (map: MapLibreMap) => void;
  /** Build a plain-text spatial context summary for the agent */
  getSpatialContext: () => string;
  /** Current grid configuration (null = no grid placed) */
  gridConfig: GridConfig | null;
  /** Place or update the grid */
  setGridConfig: (config: GridConfig | null) => void;
  /** Clear grid + all drawings (full reset to stage 1) */
  clearGrid: () => void;
  /** Fly the map to fit the current grid bounds */
  recenterToGrid: () => void;
  /** Access to the map instance (for center tracking, etc.) */
  getMap: () => MapLibreMap | null;
}

// ---------------------------------------------------------------------------
// Mode name → DrawMode mapping
// ---------------------------------------------------------------------------

/** Terra Draw internal mode names. */
const TD_MODE = {
  ignition: "ignition",
  "burn-path": "burn-path",
  "fuel-break": "fuel-break",
  select: "select",
  static: "static",
} as const;


// ---------------------------------------------------------------------------
// Styling
// ---------------------------------------------------------------------------

const FIRE_ORANGE = "#FF6B35";
const AMBER = "#FFB627";
const TEAL = "#4ECDC4";
const WHITE = "#FFFFFF";

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

const DrawContext = createContext<DrawContextValue | null>(null);

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export function DrawProvider({ children }: { children: ReactNode }) {
  const drawRef = useRef<TerraDraw | null>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const [ready, setReady] = useState(false);
  const [activeMode, setActiveMode] = useState<DrawMode | null>(null);
  const [features, setFeatures] = useState<DrawnFeatures>({
    ignitions: [],
    burnPaths: [],
    fuelBreaks: [],
  });
  const [gridConfig, setGridConfigState] = useState<GridConfig | null>(null);

  // ── Sync features from Terra Draw store → React state ──
  const syncFeatures = useCallback(() => {
    const draw = drawRef.current;
    if (!draw) return;

    const snapshot = draw.getSnapshot();
    const ignitions: DrawnIgnition[] = [];
    const burnPaths: DrawnLine[] = [];
    const fuelBreaks: DrawnLine[] = [];

    for (const feature of snapshot) {
      const mode = feature.properties?.mode as string | undefined;
      const id = String(feature.id);

      if (mode === TD_MODE.ignition && feature.geometry.type === "Point") {
        const [lng, lat] = feature.geometry.coordinates as [number, number];
        ignitions.push({ id, lng, lat });
      } else if (
        mode === TD_MODE["burn-path"] &&
        feature.geometry.type === "LineString"
      ) {
        const coords = feature.geometry.coordinates as [number, number][];
        burnPaths.push({ id, coords });
      } else if (
        mode === TD_MODE["fuel-break"] &&
        feature.geometry.type === "LineString"
      ) {
        const coords = feature.geometry.coordinates as [number, number][];
        fuelBreaks.push({ id, coords });
      }
    }

    setFeatures({ ignitions, burnPaths, fuelBreaks });
  }, []);

  // ── Attach to a MapLibre map instance ──
  const attachMap = useCallback(
    (map: MapLibreMap) => {
      // Prevent double-attach
      if (drawRef.current) return;

      mapRef.current = map;

      const adapter = new TerraDrawMapLibreGLAdapter({ map });

      const draw = new TerraDraw({
        adapter,
        modes: [
          // Ignition: click to place fire points
          new TerraDrawPointMode({
            modeName: TD_MODE.ignition,
            styles: {
              pointColor: FIRE_ORANGE,
              pointWidth: 8,
              pointOutlineColor: WHITE,
              pointOutlineWidth: 2,
              pointOpacity: 1,
            },
          }),

          // Burn team path: click vertices, double-click to finish
          new TerraDrawLineStringMode({
            modeName: TD_MODE["burn-path"],
            styles: {
              lineStringColor: AMBER,
              lineStringWidth: 3,
              closingPointColor: AMBER,
              closingPointWidth: 4,
              closingPointOutlineColor: WHITE,
              closingPointOutlineWidth: 1,
            },
          }),

          // Fuel break: click vertices, double-click to finish
          new TerraDrawLineStringMode({
            modeName: TD_MODE["fuel-break"],
            styles: {
              lineStringColor: TEAL,
              lineStringWidth: 3,
              closingPointColor: TEAL,
              closingPointWidth: 4,
              closingPointOutlineColor: WHITE,
              closingPointOutlineWidth: 1,
            },
          }),

          // Select mode for editing / deleting existing features
          new TerraDrawSelectMode({
            modeName: TD_MODE.select,
            flags: {
              point: { feature: { draggable: true } },
              linestring: {
                feature: { draggable: true, coordinates: { draggable: true } },
              },
            },
            styles: {
              selectedPointColor: WHITE,
              selectedPointWidth: 10,
              selectedPointOutlineColor: FIRE_ORANGE,
              selectedPointOutlineWidth: 2,
              selectedLineStringColor: WHITE,
              selectedLineStringWidth: 4,
            },
          }),

          // Render mode (static — for programmatic features if needed later)
          new TerraDrawRenderMode({ modeName: TD_MODE.static, styles: {} }),
        ],
      });

      draw.start();

      // Listen for feature completion
      draw.on("finish", () => {
        syncFeatures();
      });

      // Listen for changes (edits, deletes, drags)
      draw.on("change", () => {
        syncFeatures();
      });

      drawRef.current = draw;
      setReady(true);
    },
    [syncFeatures]
  );

  // ── Mode switching ──
  const setMode = useCallback(
    (mode: DrawMode | null) => {
      const draw = drawRef.current;
      if (!draw) return;

      // Snapshot all features BEFORE the mode switch.
      // draw.setMode() calls cleanUp() on the current mode, which removes
      // any in-progress (un-finished) geometry. We'll re-add valid features.
      const before = draw.getSnapshot();

      if (mode === null) {
        draw.setMode(TD_MODE.static);
        setActiveMode(null);
      } else {
        draw.setMode(TD_MODE[mode]);
        setActiveMode(mode);
      }

      // Detect features that were lost during the mode switch
      const after = draw.getSnapshot();
      const survivingIds = new Set(after.map((f) => String(f.id)));
      const lost = before.filter((f) => !survivingIds.has(String(f.id)));

      // Re-add lost features that have valid geometry.
      // IMPORTANT: In-progress lines have a trailing "tracking" coordinate
      // that follows the cursor — strip it so it doesn't become a ghost point.
      const recoverable = lost
        .map((f) => {
          if (f.geometry.type === "LineString") {
            const coords = [...(f.geometry.coordinates as [number, number][])];;
            coords.pop(); // remove cursor-tracking coordinate
            if (coords.length < 2) return null;
            return {
              ...f,
              geometry: { ...f.geometry, coordinates: coords },
            };
          }
          if (f.geometry.type === "Point") return f;
          return null;
        })
        .filter(Boolean) as GeoJSONStoreFeatures[];

      if (recoverable.length > 0) {
        draw.addFeatures(recoverable);
      }

      syncFeatures();
    },
    [syncFeatures]
  );

  // ── Feature removal ──
  const removeFeature = useCallback(
    (id: string) => {
      const draw = drawRef.current;
      if (!draw) return;
      try {
        draw.removeFeatures([id]);
        syncFeatures();
      } catch {
        // Feature might already be removed
      }
    },
    [syncFeatures]
  );

  // ── Clear drawings only (points, lines, breaks — NOT grid) ──
  const clearDrawings = useCallback(() => {
    const draw = drawRef.current;
    if (!draw) return;
    draw.clear();
    syncFeatures();
    setActiveMode(null);
    draw.setMode(TD_MODE.static);
  }, [syncFeatures]);

  // ── Grid management ──
  const setGridConfig = useCallback((config: GridConfig | null) => {
    setGridConfigState(config);
  }, []);

  const clearGrid = useCallback(() => {
    // Full reset: remove grid + all drawings
    const draw = drawRef.current;
    if (draw) {
      draw.clear();
      syncFeatures();
      setActiveMode(null);
      draw.setMode(TD_MODE.static);
    }
    setGridConfigState(null);
  }, [syncFeatures]);

  const recenterToGrid = useCallback(() => {
    const map = mapRef.current;
    const config = gridConfig;
    if (!map || !config) return;
    const bounds = getGridBounds(config);
    map.fitBounds(bounds, { padding: 60, duration: 1000 });
  }, [gridConfig]);

  const getMap = useCallback(() => mapRef.current, []);

  // ── Build spatial context string for agent injection ──
  const getSpatialContext = useCallback((): string => {
    const parts: string[] = [];

    // Grid info
    if (gridConfig) {
      const sideKm = (getGridSideMeters(gridConfig) / 1000).toFixed(1);
      parts.push(
        `Grid: ${gridConfig.cellDimension}×${gridConfig.cellDimension} cells, ` +
        `${gridConfig.cellResolution}m resolution, ${sideKm}km × ${sideKm}km area, ` +
        `centered at (${gridConfig.lat.toFixed(4)}°N, ${gridConfig.lng.toFixed(4)}°W)`
      );
    }

    // Drawn features
    const { ignitions, burnPaths, fuelBreaks } = features;

    if (ignitions.length) {
      const pts = ignitions
        .map((p) => `(${p.lat.toFixed(4)}°N, ${p.lng.toFixed(4)}°W)`)
        .join(", ");
      parts.push(`Ignition points (${ignitions.length}): ${pts}`);
    }

    if (burnPaths.length) {
      for (const path of burnPaths) {
        const pts = path.coords
          .map(([lng, lat]) => `(${lat.toFixed(4)}, ${lng.toFixed(4)})`)
          .join(" → ");
        parts.push(`Burn team path: ${pts}`);
      }
    }

    if (fuelBreaks.length) {
      for (const brk of fuelBreaks) {
        const pts = brk.coords
          .map(([lng, lat]) => `(${lat.toFixed(4)}, ${lng.toFixed(4)})`)
          .join(" → ");
        parts.push(`Fuel break: ${pts}`);
      }
    }

    if (parts.length === 0) {
      return "No grid placed and no features drawn on the map.";
    }

    return `Map state:\n${parts.join("\n")}`;
  }, [features, gridConfig]);

  // ── Keyboard shortcuts ──
  useEffect(() => {
    const SHORTCUT_MAP: Record<string, DrawMode> = {
      p: "ignition",
      l: "burn-path",
      b: "fuel-break",
    };

    function handleKeyDown(e: KeyboardEvent) {
      // Don't intercept if user is typing in an input
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;

      const key = e.key.toLowerCase();

      // M = Move mode (primary shortcut to return to pan/zoom)
      if (key === "m") {
        setMode(null);
        return;
      }

      // R = Reset / clear drawings only (not grid)
      if (key === "r") {
        clearDrawings();
        return;
      }

      // Escape = exit to Move only when NOT mid-drawing.
      // If mid-drawing, Terra Draw handles Escape natively (cancels stroke).
      if (e.key === "Escape" && activeMode !== null) {
        const draw = drawRef.current;
        if (draw) {
          const modeState = draw.getModeState();
          if (modeState === "drawing") return; // let Terra Draw cancel
        }
        setMode(null);
        return;
      }

      // Letter shortcuts: toggle draw modes (case-insensitive)
      const mapped = SHORTCUT_MAP[key];
      if (mapped) {
        setMode(activeMode === mapped ? null : mapped);
        return;
      }

      if (e.key === "Delete" || e.key === "Backspace") {
        const draw = drawRef.current;
        if (!draw || draw.getMode() !== TD_MODE.select) return;
        const snapshot = draw.getSnapshot();
        const selected = snapshot.filter(
          (f: GeoJSONStoreFeatures) => f.properties?.selected === true
        );
        if (selected.length) {
          draw.removeFeatures(selected.map((f: GeoJSONStoreFeatures) => f.id!));
          syncFeatures();
        }
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeMode, setMode, clearDrawings, syncFeatures]);

  // ── Right-click to finish line and continue drawing ──
  // When the user right-clicks mid-drawing, cycle the mode:
  // finish current feature (saved by recovery code) → re-enter same mode.
  // This lets users draw multiple separate lines without leaving the tool.
  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map) return;

    const canvas = map.getCanvas();

    function handleRightClick() {
      const draw = drawRef.current;
      if (!draw) return;

      const modeState = draw.getModeState();
      if (modeState !== "drawing") return;

      // Map Terra Draw mode name → DrawMode
      const MODE_MAP: Record<string, DrawMode | undefined> = {
        [TD_MODE.ignition]: "ignition",
        [TD_MODE["burn-path"]]: "burn-path",
        [TD_MODE["fuel-break"]]: "fuel-break",
      };

      const currentModeName = draw.getMode();
      const drawMode = MODE_MAP[currentModeName];
      if (!drawMode) return;

      // Cycle: switch to static (saves in-progress line) → re-enter same mode
      setMode(null);
      setMode(drawMode);
    }

    canvas.addEventListener("contextmenu", handleRightClick);
    return () => canvas.removeEventListener("contextmenu", handleRightClick);
  }, [ready, setMode]);

  return (
    <DrawContext.Provider
      value={{
        ready,
        activeMode,
        setMode,
        features,
        removeFeature,
        clearDrawings,
        attachMap,
        getSpatialContext,
        gridConfig,
        setGridConfig,
        clearGrid,
        recenterToGrid,
        getMap,
      }}
    >
      {children}
    </DrawContext.Provider>
  );
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useDraw(): DrawContextValue {
  const ctx = useContext(DrawContext);
  if (!ctx) {
    throw new Error("useDraw must be used within a DrawProvider");
  }
  return ctx;
}
