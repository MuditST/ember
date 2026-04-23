"use client";

import { MousePointer2, Crosshair, Spline, Shield, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useDraw, type DrawMode } from "@/lib/draw/draw-context";

// ---------------------------------------------------------------------------
// Mode definitions
// ---------------------------------------------------------------------------

interface ModeButton {
  mode: DrawMode;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  shortcut: string;
}

const FIRE_MODES: ModeButton[] = [
  { mode: "ignition", icon: Crosshair, label: "Point", shortcut: "P" },
  { mode: "burn-path", icon: Spline, label: "Line", shortcut: "L" },
];

const DEFENSE_MODES: ModeButton[] = [
  { mode: "fuel-break", icon: Shield, label: "Fuel Break", shortcut: "B" },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface DrawToolbarProps {
  className?: string;
}

export function DrawToolbar({ className }: DrawToolbarProps) {
  const { ready, activeMode, setMode, features, clearDrawings, gridConfig, simPhase } = useDraw();

  const hasFeatures =
    features.ignitions.length > 0 ||
    features.burnPaths.length > 0 ||
    features.fuelBreaks.length > 0;

  // Only show toolbar after grid is placed AND simulation is idle
  if (!ready || !gridConfig || simPhase !== "idle") return null;

  const isPanMode = activeMode === null;

  return (
    <div
      className={cn(
        "flex items-center gap-1 rounded-xl border bg-background/80 px-1.5 py-1.5 shadow-lg backdrop-blur-sm",
        className
      )}
    >
      {/* Move / Pan — icon + shortcut only */}
      <button
        onClick={() => setMode(null)}
        className={cn(
          "flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-[13px] font-medium",
          "transition-all duration-150",
          isPanMode
            ? "bg-muted text-foreground"
            : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
        )}
        title="Move & pan (M)"
      >
        <MousePointer2 className="size-4" />
        <kbd
          className={cn(
            "rounded px-1 py-0.5 text-[10px] font-mono leading-none",
            isPanMode
              ? "bg-foreground/10 text-muted-foreground"
              : "bg-muted text-muted-foreground"
          )}
        >
          M
        </kbd>
      </button>

      {/* Separator */}
      <div className="mx-0.5 h-6 w-px bg-border" />

      {/* Fire modes: Point + Line — icon + label + shortcut */}
      {FIRE_MODES.map(({ mode, icon: Icon, label, shortcut }) => {
        const isActive = activeMode === mode;
        return (
          <button
            key={mode}
            onClick={() => setMode(isActive ? null : mode)}
            className={cn(
              "flex items-center gap-1.5 rounded-lg px-3 py-2 text-[13px] font-medium",
              "transition-all duration-150",
              isActive
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
            )}
            title={`${label} (${shortcut})`}
          >
            <Icon className="size-4" />
            <span>{label}</span>
            <kbd
              className={cn(
                "hidden rounded px-1 py-0.5 text-[10px] font-mono leading-none lg:inline-block",
                isActive
                  ? "bg-primary-foreground/20 text-primary-foreground"
                  : "bg-muted text-muted-foreground"
              )}
            >
              {shortcut}
            </kbd>
          </button>
        );
      })}

      {/* Separator */}
      <div className="mx-0.5 h-6 w-px bg-border" />

      {/* Defense modes: Fuel Break — icon + label + shortcut */}
      {DEFENSE_MODES.map(({ mode, icon: Icon, label, shortcut }) => {
        const isActive = activeMode === mode;
        return (
          <button
            key={mode}
            onClick={() => setMode(isActive ? null : mode)}
            className={cn(
              "flex items-center gap-1.5 rounded-lg px-3 py-2 text-[13px] font-medium",
              "transition-all duration-150",
              isActive
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
            )}
            title={`${label} (${shortcut})`}
          >
            <Icon className="size-4" />
            <span>{label}</span>
            <kbd
              className={cn(
                "hidden rounded px-1 py-0.5 text-[10px] font-mono leading-none lg:inline-block",
                isActive
                  ? "bg-primary-foreground/20 text-primary-foreground"
                  : "bg-muted text-muted-foreground"
              )}
            >
              {shortcut}
            </kbd>
          </button>
        );
      })}

      {/* Reset — icon + shortcut only */}
      {hasFeatures && (
        <>
          <div className="mx-0.5 h-6 w-px bg-border" />
          <button
            onClick={clearDrawings}
            className={cn(
              "flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-[13px] font-medium",
              "text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
            )}
            title="Reset (R)"
          >
            <Trash2 className="size-4" />
            <kbd className="rounded px-1 py-0.5 text-[10px] font-mono leading-none text-muted-foreground bg-muted">
              R
            </kbd>
          </button>
        </>
      )}
    </div>
  );
}
