"use client";

import { useCallback, useEffect, useState } from "react";
import { MapPin, LocateFixed, X, ChevronDown, Wind, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { useDraw } from "@/lib/draw/draw-context";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Slider } from "@/components/ui/slider";

// ---------------------------------------------------------------------------
// Resolution presets
// ---------------------------------------------------------------------------

const RESOLUTION_OPTIONS = [10, 20, 30] as const;

/** Wind direction labels (degrees → cardinal). */
function windDirLabel(deg: number): string {
  const dirs = ["S", "SW", "W", "NW", "N", "NE", "E", "SE"];
  const idx = Math.round(deg / 45) % 8;
  return dirs[idx];
}

/** Format seconds as human-readable duration. */
function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0 && m > 0) return `${h}h ${m}m`;
  if (h > 0) return `${h}h`;
  return `${m}m`;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface GridInfoBarProps {
  className?: string;
}

export function GridInfoBar({ className }: GridInfoBarProps) {
  const {
    ready, gridConfig, setGridConfig, clearGrid, recenterToGrid, getMap,
    windSpeed, windDirection, simDuration,
    setWindSpeed, setWindDirection, setSimDuration,
    simPhase,
  } = useDraw();

  // Local state for the placement form
  const [dimension, setDimension] = useState(200);
  const [resolution, setResolution] = useState<number>(30);
  const [mapCenter, setMapCenter] = useState<{ lat: number; lng: number } | null>(null);
  const [gridPopoverOpen, setGridPopoverOpen] = useState(false);
  const [windPopoverOpen, setWindPopoverOpen] = useState(false);
  const [durationPopoverOpen, setDurationPopoverOpen] = useState(false);

  // Track the map center live
  useEffect(() => {
    if (!ready) return;
    const map = getMap();
    if (!map) return;

    function updateCenter() {
      const center = map!.getCenter();
      setMapCenter({ lat: center.lat, lng: center.lng });
    }

    updateCenter();
    map.on("move", updateCenter);
    return () => {
      map.off("move", updateCenter);
    };
  }, [ready, getMap]);

  // Sync local state when grid config changes (e.g. agent sets it)
  useEffect(() => {
    if (gridConfig) {
      setDimension(gridConfig.cellDimension);
      setResolution(gridConfig.cellResolution);
    }
  }, [gridConfig]);

  const handlePlaceGrid = useCallback(() => {
    if (!mapCenter) return;
    setGridConfig({
      lat: mapCenter.lat,
      lng: mapCenter.lng,
      cellResolution: resolution,
      cellDimension: dimension,
    });
  }, [mapCenter, resolution, dimension, setGridConfig]);

  const handleUpdateGrid = useCallback(() => {
    if (!gridConfig) return;
    setGridConfig({
      ...gridConfig,
      cellResolution: resolution,
      cellDimension: dimension,
    });
    setGridPopoverOpen(false);
  }, [gridConfig, resolution, dimension, setGridConfig]);

  const computedSideKm = ((dimension * resolution) / 1000).toFixed(1);

  if (!ready) return null;

  const isPlaced = gridConfig !== null;
  const isLocked = simPhase !== "idle";

  // Display coordinates — use grid center if placed, map center otherwise
  const displayLat = isPlaced ? gridConfig.lat : mapCenter?.lat;
  const displayLng = isPlaced ? gridConfig.lng : mapCenter?.lng;

  return (
    <div
      className={cn(
        "flex items-center gap-1 rounded-xl border bg-background/80 px-1.5 py-1.5 shadow-lg backdrop-blur-sm whitespace-nowrap",
        className
      )}
    >
      {/* ── Wind pill ── */}
      {isPlaced && (
        <>
          <Popover open={windPopoverOpen} onOpenChange={setWindPopoverOpen}>
            <PopoverTrigger asChild>
              <button
                className={cn(
                  "flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-[13px] font-medium",
                  "text-foreground transition-colors hover:bg-muted/50"
                )}
                disabled={isLocked}
              >
                <Wind className="size-3.5 text-muted-foreground" />
                <span className="tabular-nums">{windSpeed} m/s</span>
                <span className="text-muted-foreground">·</span>
                <span className="tabular-nums">
                  {windDirection}° {windDirLabel(windDirection)}
                </span>
                <ChevronDown className="size-3 text-muted-foreground" />
              </button>
            </PopoverTrigger>
            <PopoverContent
              align="start"
              sideOffset={8}
              className="w-64 space-y-3 rounded-xl"
            >
              <WindSettingsForm
                speed={windSpeed}
                direction={windDirection}
                onSpeedChange={setWindSpeed}
                onDirectionChange={setWindDirection}
              />
            </PopoverContent>
          </Popover>

          {/* Duration pill */}
          <Popover open={durationPopoverOpen} onOpenChange={setDurationPopoverOpen}>
            <PopoverTrigger asChild>
              <button
                className={cn(
                  "flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-[13px] font-medium",
                  "text-foreground transition-colors hover:bg-muted/50"
                )}
                disabled={isLocked}
              >
                <Clock className="size-3.5 text-muted-foreground" />
                <span className="tabular-nums">{formatDuration(simDuration)}</span>
                <ChevronDown className="size-3 text-muted-foreground" />
              </button>
            </PopoverTrigger>
            <PopoverContent
              align="center"
              sideOffset={8}
              className="w-56 space-y-3 rounded-xl"
            >
              <DurationSettingsForm
                duration={simDuration}
                onDurationChange={setSimDuration}
              />
            </PopoverContent>
          </Popover>

          <div className="mx-0.5 h-6 w-px bg-border" />
        </>
      )}

      {/* ── Grid info ── */}
      <Popover open={gridPopoverOpen} onOpenChange={setGridPopoverOpen}>
        <PopoverTrigger asChild>
          <button
            className={cn(
              "flex items-center gap-1.5 rounded-lg px-3 py-2 text-[13px] font-medium",
              "text-foreground transition-colors hover:bg-muted/50"
            )}
            disabled={isLocked}
          >
            <MapPin className="size-3.5 text-muted-foreground" />
            {displayLat != null && displayLng != null ? (
              <>
                <span className="tabular-nums">
                  {displayLat.toFixed(2)}°N, {Math.abs(displayLng).toFixed(2)}°W
                </span>
                <span className="text-muted-foreground">·</span>
                <span className="tabular-nums">
                  {dimension}×{dimension}
                </span>
                <span className="text-muted-foreground">·</span>
                <span className="tabular-nums">{computedSideKm} km</span>
              </>
            ) : (
              <span className="text-muted-foreground">Loading…</span>
            )}
            <ChevronDown className="size-3 text-muted-foreground" />
          </button>
        </PopoverTrigger>
        <PopoverContent
          align="center"
          sideOffset={8}
          className="w-72 space-y-3 rounded-xl"
        >
          <GridSettingsForm
            dimension={dimension}
            resolution={resolution}
            onDimensionChange={setDimension}
            onResolutionChange={setResolution}
            computedSideKm={computedSideKm}
          />
          {isPlaced ? (
            <button
              onClick={handleUpdateGrid}
              className={cn(
                "w-full rounded-lg bg-primary px-3 py-2 text-[13px] font-medium",
                "text-primary-foreground transition-colors hover:bg-primary/90"
              )}
            >
              Update Grid
            </button>
          ) : null}
        </PopoverContent>
      </Popover>

      <div className="mx-0.5 h-6 w-px bg-border" />

      {isPlaced ? (
        <>
          {/* Recenter */}
          <button
            onClick={recenterToGrid}
            className={cn(
              "flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-[13px] font-medium",
              "text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
            )}
            title="Recenter to grid"
          >
            <LocateFixed className="size-4" />
          </button>

          {!isLocked && (
            <>
              <div className="mx-0.5 h-6 w-px bg-border" />

              {/* Clear all */}
              <button
                onClick={clearGrid}
                className={cn(
                  "flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-[13px] font-medium",
                  "text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                )}
                title="Clear All"
              >
                <X className="size-4" />
              </button>
            </>
          )}
        </>
      ) : (
        /* Place Grid — standalone button */
        <button
          onClick={handlePlaceGrid}
          className={cn(
            "flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-[13px] font-medium",
            "text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
          )}
        >
          Place Grid
        </button>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Grid settings form
// ---------------------------------------------------------------------------

function GridSettingsForm({
  dimension,
  resolution,
  onDimensionChange,
  onResolutionChange,
  computedSideKm,
}: {
  dimension: number;
  resolution: number;
  onDimensionChange: (v: number) => void;
  onResolutionChange: (v: number) => void;
  computedSideKm: string;
}) {
  return (
    <div className="space-y-4">
      {/* Dimension slider */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-[12px] font-medium text-muted-foreground">
            Grid Dimension
          </label>
          <span className="text-[12px] font-mono tabular-nums text-foreground">
            {dimension} × {dimension}
          </span>
        </div>
        <Slider
          value={[dimension]}
          onValueChange={([v]) => onDimensionChange(v)}
          min={50}
          max={200}
          step={10}
        />
        <div className="flex justify-between text-[10px] text-muted-foreground">
          <span>50</span>
          <span>200</span>
        </div>
      </div>

      {/* Resolution toggle */}
      <div className="space-y-2">
        <label className="text-[12px] font-medium text-muted-foreground">
          Cell Resolution
        </label>
        <div className="flex gap-1">
          {RESOLUTION_OPTIONS.map((r) => (
            <button
              key={r}
              onClick={() => onResolutionChange(r)}
              className={cn(
                "flex-1 rounded-lg py-1.5 text-[12px] font-medium transition-colors",
                resolution === r
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:text-foreground"
              )}
            >
              {r}m
            </button>
          ))}
        </div>
      </div>

      {/* Computed area */}
      <div className="flex items-center justify-between px-3 py-2">
        <span className="text-[12px] text-muted-foreground">Area</span>
        <span className="text-[13px] font-medium tabular-nums">
          {computedSideKm} km × {computedSideKm} km
        </span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Wind settings form
// ---------------------------------------------------------------------------

function WindSettingsForm({
  speed,
  direction,
  onSpeedChange,
  onDirectionChange,
}: {
  speed: number;
  direction: number;
  onSpeedChange: (v: number) => void;
  onDirectionChange: (v: number) => void;
}) {
  return (
    <div className="space-y-4">
      {/* Speed slider */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-[12px] font-medium text-muted-foreground">
            Wind Speed
          </label>
          <span className="text-[12px] font-mono tabular-nums text-foreground">
            {speed} m/s
          </span>
        </div>
        <Slider
          value={[speed]}
          onValueChange={([v]) => onSpeedChange(v)}
          min={0}
          max={20}
          step={1}
        />
        <div className="flex justify-between text-[10px] text-muted-foreground">
          <span>0</span>
          <span>20 m/s</span>
        </div>
      </div>

      {/* Direction slider */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-[12px] font-medium text-muted-foreground">
            Wind Direction
          </label>
          <span className="text-[12px] font-mono tabular-nums text-foreground">
            {direction}° ({windDirLabel(direction)})
          </span>
        </div>
        <Slider
          value={[direction]}
          onValueChange={([v]) => onDirectionChange(v)}
          min={0}
          max={360}
          step={5}
        />
        <div className="flex justify-between text-[10px] text-muted-foreground">
          <span>0° (S)</span>
          <span>180° (N)</span>
          <span>360° (S)</span>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Duration settings form
// ---------------------------------------------------------------------------

const DURATION_PRESETS = [
  { label: "30m", value: 1800 },
  { label: "1h", value: 3600 },
  { label: "2h", value: 7200 },
  { label: "4h", value: 14400 },
] as const;

function DurationSettingsForm({
  duration,
  onDurationChange,
}: {
  duration: number;
  onDurationChange: (v: number) => void;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-[12px] font-medium text-muted-foreground">
          Simulation Duration
        </label>
        <span className="text-[12px] font-mono tabular-nums text-foreground">
          {formatDuration(duration)}
        </span>
      </div>

      {/* Preset buttons */}
      <div className="flex gap-1">
        {DURATION_PRESETS.map((preset) => (
          <button
            key={preset.value}
            onClick={() => onDurationChange(preset.value)}
            className={cn(
              "flex-1 rounded-lg py-1.5 text-[12px] font-medium transition-colors",
              duration === preset.value
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:text-foreground"
            )}
          >
            {preset.label}
          </button>
        ))}
      </div>

      {/* Fine-tune slider */}
      <Slider
        value={[duration]}
        onValueChange={([v]) => onDurationChange(v)}
        min={600}
        max={28800}
        step={300}
      />
      <div className="flex justify-between text-[10px] text-muted-foreground">
        <span>10m</span>
        <span>8h</span>
      </div>
    </div>
  );
}
