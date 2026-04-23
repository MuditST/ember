import { tool, UIToolInvocation } from "ai";
import { z } from "zod";
import * as api from "../devs-fire/client";

export const getSimulationInfo = tool({
  description: "Get current simulation configuration: grid size, cell resolution, and wind conditions.",
  inputSchema: z.object({
    token: z.string().describe("Session token"),
  }),
  execute: async ({ token }) => {
    const info = await api.getSimulationInfo(token);

    return {
      gridSize: info.cellSpaceSize,
      cellSizeMeters: info.cellSize,
      totalAreaKm2: +((info.cellSpaceSize * info.cellSize) ** 2 / 1_000_000).toFixed(2),
      windSpeedMs: info.windSpeed,
      windDirectionDeg: info.windDegree,
    };
  },
});

export type GetSimulationInfoInvocation = UIToolInvocation<typeof getSimulationInfo>;
