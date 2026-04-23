import { tool, UIToolInvocation } from "ai";
import { z } from "zod";
import * as api from "../devs-fire/client";

/**
 * Factory: returns a configure_simulation tool bound to the given token.
 * The model never sees the token — it's injected server-side.
 */
export function makeConfigureSimulation(getToken: () => string) {
  return tool({
    description:
      "Configure the simulation location, wind conditions, and grid resolution. " +
      "Location must be within the continental US. " +
      "Wind direction: 0°=from south, 90°=from west, 180°=from north, 270°=from east.",
    inputSchema: z.object({
      lat: z.number().describe("Latitude of simulation center"),
      lng: z.number().describe("Longitude of simulation center"),
      windSpeed: z.number().optional().describe("Wind speed in m/s (default ~3)"),
      windDirection: z
        .number()
        .optional()
        .describe("Wind direction in degrees (0=from south, clockwise)"),
      cellResolution: z
        .number()
        .optional()
        .describe("Cell size in meters (default 30)"),
      cellDimension: z
        .number()
        .optional()
        .describe("Grid dimension — cells per side (default 200)"),
      simDuration: z
        .number()
        .optional()
        .describe("Simulation duration in seconds (default 3600 = 1 hour)"),
    }),
    execute: async ({ lat, lng, windSpeed, windDirection, cellResolution, cellDimension, simDuration }) => {
      const token = getToken();
      await api.configureSimulation(token, {
        lat,
        lng,
        windSpeed,
        windDirection,
        cellResolution,
        cellDimension,
      });

      return {
        location: { lat, lng },
        wind: {
          speed: windSpeed ?? "default",
          direction: windDirection ?? "default",
        },
        grid: {
          resolution: cellResolution ?? 30,
          dimension: cellDimension ?? 200,
        },
        simDuration: simDuration ?? null,
      };
    },
  });
}

/** Static instance for type inference only — never executed directly. */
export const configureSimulation = makeConfigureSimulation(() => "");

export type ConfigureSimulationInvocation = UIToolInvocation<typeof configureSimulation>;
