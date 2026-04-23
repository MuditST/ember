import { tool, UIToolInvocation } from "ai";
import { z } from "zod";
import * as api from "../devs-fire/client";

export const configureSimulation = tool({
  description:
    "Configure the simulation location, wind conditions, and grid resolution. " +
    "Location must be within the continental US. " +
    "Wind direction: 0°=from south, 90°=from west, 180°=from north, 270°=from east.",
  inputSchema: z.object({
    token: z.string().describe("Session token from create_simulation"),
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
  }),
  execute: async ({ token, lat, lng, windSpeed, windDirection, cellResolution, cellDimension }) => {
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
    };
  },
});

export type ConfigureSimulationInvocation = UIToolInvocation<typeof configureSimulation>;
