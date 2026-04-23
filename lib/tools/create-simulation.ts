import { tool, UIToolInvocation } from "ai";
import { z } from "zod";
import * as api from "../devs-fire/client";

export const createSimulation = tool({
  description: "Create a new simulation session. Must be called before any other tool.",
  inputSchema: z.object({}),
  execute: async () => {
    const token = await api.connectToServer();
    return { token };
  },
});

export type CreateSimulationInvocation = UIToolInvocation<typeof createSimulation>;
