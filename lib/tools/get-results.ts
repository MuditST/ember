import { tool, UIToolInvocation } from "ai";
import { z } from "zod";
import * as api from "../devs-fire/client";

export const getResults = tool({
  description: "Fetch simulation results: burned area, perimeter, and cell counts.",
  inputSchema: z.object({
    token: z.string().describe("Session token"),
  }),
  execute: async ({ token }) => {
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

export type GetResultsInvocation = UIToolInvocation<typeof getResults>;
