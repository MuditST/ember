import { tool, UIToolInvocation } from "ai";
import { z } from "zod";
import * as api from "../devs-fire/client";
import { setCachedCells } from "../devs-fire/cell-cache";

interface RunSimulationOptions {
  requiresApproval?: boolean;
}

/**
 * Factory: returns a run_simulation tool bound to the given token.
 * Uses needsApproval: true — client shows approval UI before execution.
 *
 * Raw CellOperation[] is cached server-side for the UI to fetch separately.
 * Post-run stats (burned area, perimeter) are fetched inline and returned
 * to the agent context — this avoids a separate get_results call which
 * would 500 if called before the run completes.
 */
export function makeRunSimulation(
  getToken: () => string,
  { requiresApproval = false }: RunSimulationOptions = {},
) {
  return tool({
    description:
      "Run or continue the simulation for a specified duration. " +
      "Use 'run' mode for the initial execution, 'continue' to extend. " +
      "Typical values: 3600 = 1 hour, 7200 = 2 hours, 14400 = 4 hours. " +
      "Returns both the cell operation count and post-run statistics (burned area, perimeter).",
    inputSchema: z.object({
      time: z.number().describe("Simulation duration in seconds"),
      mode: z
        .enum(["run", "continue"])
        .optional()
        .describe("'run' for initial execution (default), 'continue' to extend"),
    }),
    needsApproval: requiresApproval,
    execute: async ({ time, mode }) => {
      const token = getToken();
      console.log("[ember][run_simulation] start", {
        tokenPreview: token.slice(0, 8),
        time,
        mode: mode ?? "run",
        requiresApproval,
      });

      let cells;
      try {
        cells =
          mode === "continue"
            ? await api.continueSimulation(token, time)
            : await api.runSimulation(token, time);
      } catch (error) {
        console.error("[ember][run_simulation] DEVS-FIRE call failed", {
          tokenPreview: token.slice(0, 8),
          time,
          mode: mode ?? "run",
          error:
            error instanceof Error
              ? { name: error.name, message: error.message }
              : String(error),
        });
        throw error;
      }

      console.log("[ember][run_simulation] returned cells", {
        tokenPreview: token.slice(0, 8),
        count: cells.length,
      });

      // ── Empty result detection ──
      if (cells.length === 0) {
        return {
          cellOperations: 0,
          timeSimulated: time,
          mode: mode ?? "run",
          status: "no_ignition" as const,
          message:
            "No fire activity recorded. This usually means no ignition source was configured. " +
            "Please set at least one ignition point before running.",
        };
      }

      // Check if fire actually spread
      const spreadCells = cells.filter(
        (c) => c.Operation === "BurnCell" && parseFloat(c.time) > 0,
      );

      if (spreadCells.length === 0) {
        setCachedCells(token, cells);
        return {
          cellOperations: cells.length,
          spreadCells: 0,
          cells,
          timeSimulated: time,
          mode: mode ?? "run",
          status: "no_spread" as const,
          message:
            "The fire was ignited but did not spread. The terrain in this area is likely " +
            "non-burnable (urban, water, or barren land). Consider moving the grid to a " +
            "forested or chaparral area.",
        };
      }

      // ── Success: cache cells + fetch post-run stats inline ──
      setCachedCells(token, cells);

      // Fetch stats now that the run is complete (these 500 before run)
      let burnedAreaM2 = 0;
      let perimeterKm = 0;
      try {
        const [ba, pl] = await Promise.all([
          api.computeBurnedArea(token),
          api.computePerimeterLength(token),
        ]);
        burnedAreaM2 = ba;
        perimeterKm = pl;
      } catch {
        // Stats fetch failed — non-critical, return without them
      }

      return {
        cellOperations: cells.length,
        spreadCells: spreadCells.length,
        cells,
        timeSimulated: time,
        mode: mode ?? "run",
        status: "success" as const,
        burnedAreaKm2: +(burnedAreaM2 / 1_000_000).toFixed(3),
        perimeterKm: +perimeterKm.toFixed(2),
      };
    },
  });
}

/** Static instance for type inference only. */
export const runSimulation = makeRunSimulation(() => "", {
  requiresApproval: false,
});

export type RunSimulationInvocation = UIToolInvocation<typeof runSimulation>;
