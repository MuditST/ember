import { tool, UIToolInvocation } from "ai";
import { z } from "zod";
import * as api from "../devs-fire/client";

/**
 * Factory: returns a run_simulation tool bound to the given token.
 * Uses needsApproval: true — client shows approval UI before execution.
 */
export function makeRunSimulation(getToken: () => string) {
  return tool({
    description:
      "Run or continue the simulation for a specified duration. " +
      "Use 'run' mode for the initial execution, 'continue' to extend. " +
      "Typical values: 3600 = 1 hour, 7200 = 2 hours, 14400 = 4 hours.",
    inputSchema: z.object({
      time: z.number().describe("Simulation duration in seconds"),
      mode: z
        .enum(["run", "continue"])
        .optional()
        .describe("'run' for initial execution (default), 'continue' to extend"),
    }),
    needsApproval: true,
    execute: async ({ time, mode }) => {
      const token = getToken();
      const cells =
        mode === "continue"
          ? await api.continueSimulation(token, time)
          : await api.runSimulation(token, time);

      return {
        cellOperations: cells.length,
        timeSimulated: time,
        mode: mode ?? "run",
      };
    },
  });
}

/** Static instance for type inference only. */
export const runSimulation = makeRunSimulation(() => "");

export type RunSimulationInvocation = UIToolInvocation<typeof runSimulation>;
