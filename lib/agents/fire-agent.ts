import { ToolLoopAgent, InferAgentUIMessage } from "ai";
import { vertex } from "@ai-sdk/google-vertex";
import { SYSTEM_PROMPT } from "../prompts/system";
import * as tools from "../tools";

export const fireAgent = new ToolLoopAgent({
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
export type FireAgentUIMessage = InferAgentUIMessage<typeof fireAgent>;
