import { tool, UIToolInvocation } from "ai";
import { z } from "zod";
import * as api from "../devs-fire/client";

export const setPointIgnition = tool({
  description:
    "Set one or more simultaneous point ignition locations on the grid. " +
    "Coordinates are cell indices (0-based), not lat/lng.",
  inputSchema: z.object({
    token: z.string().describe("Session token"),
    xs: z.string().describe("Comma-separated x coordinates (e.g. '100' or '50,100,150')"),
    ys: z.string().describe("Comma-separated y coordinates (e.g. '100' or '50,100,150')"),
  }),
  execute: async ({ token, xs, ys }) => {
    await api.setPointIgnition(token, xs, ys);

    const xArr = xs.split(",").map(Number);
    const yArr = ys.split(",").map(Number);
    const points = xArr.map((x, i) => ({ x, y: yArr[i] }));

    return { points, count: points.length };
  },
});

export type SetPointIgnitionInvocation = UIToolInvocation<typeof setPointIgnition>;
