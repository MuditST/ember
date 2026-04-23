import { tool, UIToolInvocation } from "ai";
import { z } from "zod";
import * as api from "../devs-fire/client";

/**
 * Session token ref — a mutable container scoped per-request.
 * `create_simulation` writes to it; all other tools read from it.
 */
export type SessionTokenRef = { current: string };

/**
 * Factory: returns a create_simulation tool that captures the token
 * into the provided mutable ref on execution.
 */
export function makeCreateSimulation(tokenRef: SessionTokenRef) {
  return tool({
    description:
      "Create a new simulation session. Must be called before any other tool. " +
      "Returns a session confirmation. The token is managed automatically.",
    inputSchema: z.object({}),
    execute: async () => {
      const token = await api.connectToServer();
      tokenRef.current = token;
      return { token, status: "session_created" };
    },
  });
}

/** Static instance for type inference only — never executed directly. */
export const createSimulation = makeCreateSimulation({ current: "" });

export type CreateSimulationInvocation = UIToolInvocation<typeof createSimulation>;
