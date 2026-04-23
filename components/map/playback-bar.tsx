"use client";

import { useEffect, useRef, useCallback, useMemo } from "react";
import { Play, Pause, RotateCcw, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useDraw } from "@/lib/draw/draw-context";
import { Slider } from "@/components/ui/slider";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const SPEED_OPTIONS = [1, 2, 4, 8] as const;
const TICK_INTERVAL_MS = 50; // 20 fps base

/** Format simulation seconds as mm:ss or h:mm:ss. */
function formatSimTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${m}:${String(s).padStart(2, "0")}`;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface PlaybackBarProps {
  className?: string;
}

export function PlaybackBar({ className }: PlaybackBarProps) {
  const {
    simPhase,
    simulationCells,
    playbackTime,
    setPlaybackTime,
    isPlaying,
    setIsPlaying,
    playbackSpeed,
    setPlaybackSpeed,
    dismissSimulation,
  } = useDraw();

  // Compute max time from cell operations
  const maxTime = useMemo(() => {
    if (!simulationCells || simulationCells.length === 0) return 0;
    let max = 0;
    for (const cell of simulationCells) {
      const t = parseFloat(cell.time);
      if (t > max) max = t;
    }
    return max;
  }, [simulationCells]);

  // Playback timer
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const playbackTimeRef = useRef(playbackTime);
  playbackTimeRef.current = playbackTime;

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (!isPlaying || maxTime === 0) {
      stopTimer();
      return;
    }

    // Advance playback time each tick
    const step = (maxTime / 200) * playbackSpeed; // ~200 steps to full
    timerRef.current = setInterval(() => {
      const next = playbackTimeRef.current + step;
      if (next >= maxTime) {
        setPlaybackTime(maxTime);
        setIsPlaying(false);
      } else {
        setPlaybackTime(next);
      }
    }, TICK_INTERVAL_MS);

    return stopTimer;
  }, [isPlaying, maxTime, playbackSpeed, setPlaybackTime, setIsPlaying, stopTimer]);

  const handlePlayPause = useCallback(() => {
    if (playbackTime >= maxTime) {
      // Reset to beginning and play
      setPlaybackTime(0);
      setIsPlaying(true);
    } else {
      setIsPlaying(!isPlaying);
    }
  }, [playbackTime, maxTime, isPlaying, setPlaybackTime, setIsPlaying]);

  const handleReset = useCallback(() => {
    setPlaybackTime(0);
    setIsPlaying(false);
  }, [setPlaybackTime, setIsPlaying]);

  // Only show during running or ready phases
  if (simPhase === "idle") return null;

  const isRunning = simPhase === "running";

  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-xl border bg-background/80 px-2 py-1.5 shadow-lg backdrop-blur-sm",
        className
      )}
    >
      {isRunning ? (
        /* Loading state while simulation is running on the server */
        <div className="flex items-center gap-2 px-3 py-1.5 text-[13px] text-muted-foreground">
          <div className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
          <span>Running simulation…</span>
        </div>
      ) : (
        <>
          {/* Play / Pause */}
          <button
            onClick={handlePlayPause}
            className={cn(
              "flex size-8 items-center justify-center rounded-lg transition-colors",
              "text-foreground hover:bg-muted"
            )}
            title={isPlaying ? "Pause" : "Play"}
          >
            {isPlaying ? (
              <Pause className="size-4" />
            ) : (
              <Play className="size-4 ml-0.5" />
            )}
          </button>

          {/* Timeline scrubber */}
          <div className="flex flex-1 items-center gap-2 min-w-[200px]">
            <Slider
              value={[playbackTime]}
              onValueChange={([v]) => {
                setPlaybackTime(v);
                if (isPlaying) setIsPlaying(false);
              }}
              min={0}
              max={maxTime || 1}
              step={maxTime / 500 || 1}
              className="flex-1"
            />
          </div>

          {/* Time display */}
          <span className="text-[11px] font-mono tabular-nums text-muted-foreground whitespace-nowrap min-w-[80px] text-center">
            {formatSimTime(playbackTime)} / {formatSimTime(maxTime)}
          </span>

          {/* Speed toggle */}
          <button
            onClick={() => {
              const idx = SPEED_OPTIONS.indexOf(playbackSpeed as typeof SPEED_OPTIONS[number]);
              const next = SPEED_OPTIONS[(idx + 1) % SPEED_OPTIONS.length];
              setPlaybackSpeed(next);
            }}
            className={cn(
              "rounded-lg px-2 py-1 text-[11px] font-medium transition-colors",
              "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
            title="Playback speed"
          >
            {playbackSpeed}×
          </button>

          <div className="mx-0.5 h-6 w-px bg-border" />

          {/* Reset */}
          <button
            onClick={handleReset}
            className={cn(
              "flex size-8 items-center justify-center rounded-lg transition-colors",
              "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
            title="Reset playback"
          >
            <RotateCcw className="size-3.5" />
          </button>

          {/* Dismiss / go back to editing */}
          <button
            onClick={dismissSimulation}
            className={cn(
              "flex size-8 items-center justify-center rounded-lg transition-colors",
              "text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
            )}
            title="Dismiss results"
          >
            <X className="size-3.5" />
          </button>
        </>
      )}
    </div>
  );
}
