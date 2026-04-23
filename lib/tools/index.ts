// Static tool instances — used for type inference (InferAgentUIMessage).
// These are never executed directly — the agent uses factory-built versions.
export { createSimulation } from "./create-simulation";
export { configureSimulation } from "./configure-simulation";
export { setPointIgnition } from "./set-point-ignition";
export { setBurnTeam } from "./set-burn-team";
export { setFuelBreak } from "./set-fuel-break";
export { runSimulation } from "./run-simulation";
export { getResults } from "./get-results";
export { getTerrainData } from "./get-terrain-data";
export { getSimulationInfo } from "./get-simulation-info";

// Factory functions — used at runtime to create token-bound tool instances.
export { makeCreateSimulation } from "./create-simulation";
export { makeConfigureSimulation } from "./configure-simulation";
export { makeSetPointIgnition } from "./set-point-ignition";
export { makeSetBurnTeam } from "./set-burn-team";
export { makeSetFuelBreak } from "./set-fuel-break";
export { makeRunSimulation } from "./run-simulation";
export { makeGetResults } from "./get-results";
export { makeGetTerrainData } from "./get-terrain-data";
export { makeGetSimulationInfo } from "./get-simulation-info";

// Token ref type
export type { SessionTokenRef } from "./create-simulation";
