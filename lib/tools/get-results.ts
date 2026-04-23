import { tool, UIToolInvocation } from "ai";
import { z } from "zod";
import * as api from "../devs-fire/client";

/**
 * Factory: returns a get_results tool bound to the given token.
 */
export function makeGetResults(getToken: () => string) {
  return tool({
    description: "Fetch simulation results: burned area, perimeter, and cell counts.",
    inputSchema: z.object({}),
    execute: async () => {
      const token = getToken();
      const results = await api.getResults(token);

      return {
        burnedArea: results.burnedArea,
        burnedAreaKm2: +(results.burnedArea / 1_000_000).toFixed(3),
        perimeterLength: results.perimeterLength,
        burningCells: results.burningCells,
        unburnedCells: results.unburnedCells,
        perimeterCellCount: results.perimeterCells.length,
        perimeterCells: results.perimeterCells,
      };
    },
  });
}

/** Static instance for type inference only. */
export const getResults = makeGetResults(() => "");

export type GetResultsInvocation = UIToolInvocation<typeof getResults>;
