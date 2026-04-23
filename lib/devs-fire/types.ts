/**
 * DEVS-FIRE API response types.
 *
 * Types derived from live API testing against https://firesim.cs.gsu.edu/api/
 * Note: The API returns x/y as strings in simulation results, not numbers.
 */

// ---------------------------------------------------------------------------
// Simulation results
// ---------------------------------------------------------------------------

/** A single cell operation returned by runSimulation / continueSimulation. */
export interface CellOperation {
  /** Cell column (returned as string by the API). */
  x: string;
  /** Cell row (returned as string by the API). */
  y: string;
  /** Operation type — e.g. "BurnTeam", "BurnCell". */
  Operation: string;
  /** Simulation time at which this operation occurred. */
  time: string;
  /** Cell state after operation — e.g. "1" for burning. */
  state?: string;
}

/** Aggregated simulation results from multiple stat endpoints. */
export interface SimulationResults {
  /** Perimeter cell coordinates as "x,y" strings. */
  perimeterCells: string[];
  /** Total burned area in square meters. */
  burnedArea: number;
  /** Perimeter length in kilometers. */
  perimeterLength: number;
  /** Number of currently burning cells. */
  burningCells: number;
  /** Number of unburned cells remaining. */
  unburnedCells: number;
}

// ---------------------------------------------------------------------------
// Terrain / grid data
// ---------------------------------------------------------------------------

/** 2D grid data — fuel types, slope values, or aspect values. */
export type GridData = number[][];

/** Current simulation grid and wind info. */
export interface SimulationInfo {
  /** Grid dimension (e.g. 200 for a 200×200 grid). */
  cellSpaceSize: number;
  /** Cell resolution in meters (e.g. 30). */
  cellSize: number;
  /** Wind speed in m/s. */
  windSpeed: number;
  /** Wind direction in degrees (0 = south, 90 = west, clockwise). */
  windDegree: number;
}

/** Terrain data bundle from fuel, slope, and aspect endpoints. */
export interface TerrainData {
  fuel: GridData;
  slope: GridData;
  aspect: GridData;
}

// ---------------------------------------------------------------------------
// Dynamic ignition (burn teams)
// ---------------------------------------------------------------------------

/** A single waypoint in a burn team path. */
export interface Waypoint {
  x: number;
  y: number;
}

/** A line segment for a fuel break (suppressed cells). */
export interface FuelBreakSegment {
  x1: number;
  y1: number;
  x2?: number;
  y2?: number;
}

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

/** Parameters for configuring a simulation session. */
export interface SimulationConfig {
  lat: number;
  lng: number;
  windSpeed?: number;
  windDirection?: number;
  cellResolution?: number;
  cellDimension?: number;
}

/** Parameters for a burn team path segment. */
export interface BurnTeamConfig {
  teamNum: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  speed: number;
  mode?: "continuous" | "spot";
  distance?: number;
  waitTime?: number;
}
