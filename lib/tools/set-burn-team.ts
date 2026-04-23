import { tool, UIToolInvocation } from "ai";
import { z } from "zod";
import * as api from "../devs-fire/client";

/**
 * Factory: returns a set_burn_team tool bound to the given token.
 */
export function makeSetBurnTeam(getToken: () => string) {
  return tool({
    description:
      "Configure a burn team's path (line/dynamic ignition). " +
      "Provide waypoints as an ordered array — each consecutive pair becomes a path segment. " +
      "Same teamName with multiple calls = sequential path. Different teamNames = simultaneous teams.",
    inputSchema: z.object({
      teamName: z.string().describe("Team identifier (e.g. 'team0', 'team1')"),
      waypoints: z
        .array(z.object({ x: z.number(), y: z.number() }))
        .min(2)
        .describe("Ordered path waypoints (cell coordinates). At least 2."),
      speed: z.number().describe("Burn team speed in m/s (typical: 0.2–1.0)"),
      mode: z
        .enum(["continuous", "spot"])
        .optional()
        .describe("Ignition mode — 'continuous' (fire line) or 'spot' (discrete points)"),
      waitTime: z
        .number()
        .optional()
        .describe("Seconds to wait before starting this team"),
    }),
    execute: async ({ teamName, waypoints, speed, mode, waitTime }) => {
      const token = getToken();
      const segments: Array<{ from: { x: number; y: number }; to: { x: number; y: number } }> = [];

      for (let i = 0; i < waypoints.length - 1; i++) {
        await api.setDynamicIgnition(token, {
          teamNum: teamName,
          x1: waypoints[i].x,
          y1: waypoints[i].y,
          x2: waypoints[i + 1].x,
          y2: waypoints[i + 1].y,
          speed,
          mode,
          waitTime: i === 0 ? waitTime : undefined,
        });

        segments.push({
          from: { x: waypoints[i].x, y: waypoints[i].y },
          to: { x: waypoints[i + 1].x, y: waypoints[i + 1].y },
        });
      }

      return {
        teamName,
        segments,
        segmentCount: segments.length,
        speed,
        mode: mode ?? "continuous",
        waitTime: waitTime ?? 0,
      };
    },
  });
}

/** Static instance for type inference only. */
export const setBurnTeam = makeSetBurnTeam(() => "");

export type SetBurnTeamInvocation = UIToolInvocation<typeof setBurnTeam>;
