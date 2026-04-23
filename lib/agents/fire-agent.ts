import { ToolLoopAgent, InferAgentUIMessage, stepCountIs } from "ai";
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
    get_terrain_data: tools.getTerrainData,
  },
});

/** Inferred UIMessage type for type-safe rendering in chat components. */
export type FireAgentUIMessage = InferAgentUIMessage<typeof staticAgent>;

// ---------------------------------------------------------------------------
// Runtime agent factory — creates a properly wired agent per request.
// ---------------------------------------------------------------------------

/** All tool names that require an active session (pre-run safe). */
const SESSION_TOOLS = [
  "configure_simulation",
  "set_point_ignition",
  "set_burn_team",
  "set_fuel_break",
  "run_simulation",
  "get_terrain_data",
] as const;

// get_results and get_simulation_info are NOT included above because
// their DEVS-FIRE endpoints return 500 before the first completed run.
// Post-run stats are now folded into run_simulation itself.

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
 *    - Token exists → session tools only (create_simulation hidden)
 */
export function createFireAgent(tokenRef: SessionTokenRef, spatialContext?: string) {
  const getToken = () => {
    if (!tokenRef.current) {
      throw new Error("No active simulation session. Call create_simulation first.");
    }
    return tokenRef.current;
  };

  // Build system prompt with spatial context injected dynamically.
  // This gives the agent awareness of drawn features on every turn.
  const instructions = spatialContext
    ? `${SYSTEM_PROMPT}\n\n## Current Map State\n${spatialContext}`
    : SYSTEM_PROMPT;

  return new ToolLoopAgent({
    model: vertex("gemini-3-flash-preview"),
    instructions,
    stopWhen: stepCountIs(8),
    tools: {
      create_simulation: tools.makeCreateSimulation(tokenRef),
      configure_simulation: tools.makeConfigureSimulation(getToken),
      set_point_ignition: tools.makeSetPointIgnition(getToken),
      set_burn_team: tools.makeSetBurnTeam(getToken),
      set_fuel_break: tools.makeSetFuelBreak(getToken),
      run_simulation: tools.makeRunSimulation(getToken, {
        requiresApproval: false,
      }),
      get_terrain_data: tools.makeGetTerrainData(getToken),
    },
    prepareStep: async () => {
      // Gate tool availability based on session state.
      if (!tokenRef.current) {
        // No session → only create_simulation is available.
        return { activeTools: ["create_simulation"] };
      }

      // Session exists → hide create_simulation so the model can't
      // accidentally reset the session. Only pre-run-safe tools available.
      return { activeTools: [...SESSION_TOOLS] };
    },
  });
}
