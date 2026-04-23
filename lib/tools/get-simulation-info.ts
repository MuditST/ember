import { tool, UIToolInvocation } from "ai";
import { z } from "zod";
import * as api from "../devs-fire/client";

/**
 * Factory: returns a get_simulation_info tool bound to the given token.
 */
export function makeGetSimulationInfo(getToken: () => string) {
  return tool({
    description: "Get current simulation configuration: grid size, cell resolution, and wind conditions.",
    inputSchema: z.object({}),
    execute: async () => {
      const token = getToken();
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
}

/** Static instance for type inference only. */
export const getSimulationInfo = makeGetSimulationInfo(() => "");

export type GetSimulationInfoInvocation = UIToolInvocation<typeof getSimulationInfo>;
