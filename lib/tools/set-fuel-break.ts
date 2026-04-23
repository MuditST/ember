import { tool, UIToolInvocation } from "ai";
import { z } from "zod";
import * as api from "../devs-fire/client";

/**
 * Factory: returns a set_fuel_break tool bound to the given token.
 */
export function makeSetFuelBreak(getToken: () => string) {
  return tool({
    description:
      "Create a fuel break (suppressed cells) along a line. " +
      "Provide segments as pairs of cell coordinates. Suppressed cells will not burn.",
    inputSchema: z.object({
      segments: z
        .array(
          z.object({
            x1: z.number(),
            y1: z.number(),
            x2: z.number(),
            y2: z.number(),
          }),
        )
        .min(1)
        .describe("Line segments defining the fuel break path"),
    }),
    execute: async ({ segments }) => {
      const token = getToken();
      for (const segment of segments) {
        await api.setSuppressedCell(token, segment);
      }

      return { segments, segmentCount: segments.length };
    },
  });
}

/** Static instance for type inference only. */
export const setFuelBreak = makeSetFuelBreak(() => "");

export type SetFuelBreakInvocation = UIToolInvocation<typeof setFuelBreak>;
