import { ToolLoopAgent, InferAgentUIMessage } from "ai";
import { vertex } from "@ai-sdk/google-vertex";
import { SYSTEM_PROMPT } from "../prompts/system";
import * as tools from "../tools";
import type { SessionTokenRef } from "../tools";

// ---------------------------------------------------------------------------
// Static agent — for type inference ONLY. Never executed.
// ---------------------------------------------------------------------------

/**
 * Static agent definition whose sole purpose is type inference.
 * `InferAgentUIMessage` reads the tool keys and their inputSchema/output types
 * to produce a fully typed UIMessage. Since all factory-built tools share
 * identical schemas with these static instances, the inferred types match.
 */
const staticAgent = new ToolLoopAgent({
  model: vertex("gemini-3-flash-preview"),
  instructions: SYSTEM_PROMPT,
  tools: {
    create_simulation: tools.createSimulation,
    configure_simulation: tools.configureSimulation,
    set_point_ignition: tools.setPointIgnition,
    set_burn_team: tools.setBurnTeam,
    set_fuel_break: tools.setFuelBreak,
    run_simulation: tools.runSimulation,
    get_results: tools.getResults,
    get_terrain_data: tools.getTerrainData,
    get_simulation_info: tools.getSimulationInfo,
  },
});

/** Inferred UIMessage type for type-safe rendering in chat components. */
export type FireAgentUIMessage = InferAgentUIMessage<typeof staticAgent>;

// ---------------------------------------------------------------------------
// Runtime agent factory — creates a properly wired agent per request.
// ---------------------------------------------------------------------------

/** All tool names that require an active session. */
const SESSION_TOOLS = [
  "configure_simulation",
  "set_point_ignition",
  "set_burn_team",
  "set_fuel_break",
  "run_simulation",
  "get_results",
  "get_terrain_data",
  "get_simulation_info",
] as const;

const ALL_TOOLS = ["create_simulation", ...SESSION_TOOLS] as const;

/**
 * Create a request-scoped fire agent.
 *
 * ## How token management works
 *
 * 1. The API route creates a `SessionTokenRef` per request.
 *    If the conversation already has a token (from a previous turn),
 *    the API route pre-fills `tokenRef.current` before calling this.
 *
 * 2. `create_simulation` WRITES to `tokenRef.current` when executed.
 *    This makes the token immediately available within the same agent run.
 *
 * 3. All other tools READ from `tokenRef.current` via their factory closures.
 *    If no token exists, the getter throws a clear error.
 *
 * 4. `prepareStep` gates tool availability:
 *    - No token → only `create_simulation` is available
 *    - Token exists → all tools are available
 *
 * This handles both same-turn flows (create → configure → ignite → run)
 * and cross-turn flows (token from a previous conversation turn).
 */
export function createFireAgent(tokenRef: SessionTokenRef) {
  const getToken = () => {
    if (!tokenRef.current) {
      throw new Error("No active simulation session. Call create_simulation first.");
    }
    return tokenRef.current;
  };

  return new ToolLoopAgent({
    model: vertex("gemini-3-flash-preview"),
    instructions: SYSTEM_PROMPT,
    tools: {
      create_simulation: tools.makeCreateSimulation(tokenRef),
      configure_simulation: tools.makeConfigureSimulation(getToken),
      set_point_ignition: tools.makeSetPointIgnition(getToken),
      set_burn_team: tools.makeSetBurnTeam(getToken),
      set_fuel_break: tools.makeSetFuelBreak(getToken),
      run_simulation: tools.makeRunSimulation(getToken),
      get_results: tools.makeGetResults(getToken),
      get_terrain_data: tools.makeGetTerrainData(getToken),
      get_simulation_info: tools.makeGetSimulationInfo(getToken),
    },
    prepareStep: async () => {
      // Gate tool availability based on session state.
      // Before a token exists, only create_simulation is offered to the model.
      // This prevents the model from attempting API calls without a session.
      if (!tokenRef.current) {
        return { activeTools: ["create_simulation"] };
      }

      // Token exists — all tools available, no restrictions.
      return {};
    },
  });
}
