import { tool, UIToolInvocation } from "ai";
import { z } from "zod";
import * as api from "../devs-fire/client";

export const getTerrainData = tool({
  description:
    "Fetch terrain data for the current simulation grid: fuel types, slope, and aspect. " +
    "Returns 2D arrays. Useful for understanding fire behavior factors.",
  inputSchema: z.object({
    token: z.string().describe("Session token"),
  }),
  execute: async ({ token }) => {
    const terrain = await api.getTerrainData(token);

    // Return summary stats instead of full grids (too large for chat)
    const fuelFlat = terrain.fuel.flat();
    const slopeFlat = terrain.slope.flat();

    const uniqueFuels = [...new Set(fuelFlat)].sort((a, b) => a - b);
    const avgSlope = +(slopeFlat.reduce((a, b) => a + b, 0) / slopeFlat.length).toFixed(2);
    const maxSlope = Math.max(...slopeFlat);

    return {
      gridSize: terrain.fuel.length,
      uniqueFuelTypes: uniqueFuels,
      fuelTypeCount: uniqueFuels.length,
      avgSlope,
      maxSlope,
    };
  },
});

export type GetTerrainDataInvocation = UIToolInvocation<typeof getTerrainData>;
