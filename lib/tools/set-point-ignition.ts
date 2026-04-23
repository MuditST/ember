import { tool, UIToolInvocation } from "ai";
import { z } from "zod";
import * as api from "../devs-fire/client";

/**
 * Factory: returns a set_point_ignition tool bound to the given token.
 */
export function makeSetPointIgnition(getToken: () => string) {
  return tool({
    description:
      "Set one or more simultaneous point ignition locations on the grid. " +
      "Coordinates are cell indices (0-based), not lat/lng.",
    inputSchema: z.object({
      xs: z.string().describe("Comma-separated x coordinates (e.g. '100' or '50,100,150')"),
      ys: z.string().describe("Comma-separated y coordinates (e.g. '100' or '50,100,150')"),
    }),
    execute: async ({ xs, ys }) => {
      const token = getToken();
      await api.setPointIgnition(token, xs, ys);

      const xArr = xs.split(",").map(Number);
      const yArr = ys.split(",").map(Number);
      const points = xArr.map((x, i) => ({ x, y: yArr[i] }));

      return { points, count: points.length };
    },
  });
}

/** Static instance for type inference only. */
export const setPointIgnition = makeSetPointIgnition(() => "");

export type SetPointIgnitionInvocation = UIToolInvocation<typeof setPointIgnition>;
