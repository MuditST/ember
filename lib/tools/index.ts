// Static tool instances — used for type inference (InferAgentUIMessage).
// These are never executed directly — the agent uses factory-built versions.
export { createSimulation } from "./create-simulation";
export { configureSimulation } from "./configure-simulation";
export { setPointIgnition } from "./set-point-ignition";
export { setBurnTeam } from "./set-burn-team";
export { setFuelBreak } from "./set-fuel-break";
export { runSimulation } from "./run-simulation";
export { getTerrainData } from "./get-terrain-data";

// Factory functions — used at runtime to create token-bound tool instances.
export { makeCreateSimulation } from "./create-simulation";
export { makeConfigureSimulation } from "./configure-simulation";
export { makeSetPointIgnition } from "./set-point-ignition";
export { makeSetBurnTeam } from "./set-burn-team";
export { makeSetFuelBreak } from "./set-fuel-break";
export { makeRunSimulation } from "./run-simulation";
export { makeGetTerrainData } from "./get-terrain-data";

// get_results and get_simulation_info are intentionally NOT exported here.
// Their DEVS-FIRE endpoints 500 before the first completed run.
// Post-run stats are now folded into run_simulation.

// Token ref type
export type { SessionTokenRef } from "./create-simulation";
