import type {
  BurnTeamConfig,
  CellOperation,
  FuelBreakSegment,
  GridData,
  SimulationConfig,
  SimulationInfo,
  SimulationResults,
  TerrainData,
} from "./types";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const DEFAULT_DEVS_FIRE_BASE_URL = "http://firesim.cs.gsu.edu:8084/api";
export const DEVS_FIRE_BASE_URL =
  process.env.DEVS_FIRE_BASE_URL ?? DEFAULT_DEVS_FIRE_BASE_URL;
const REQUEST_TIMEOUT_MS = 15000;

// ---------------------------------------------------------------------------
// Error handling
// ---------------------------------------------------------------------------

export class DevsFireError extends Error {
  constructor(
    public readonly endpoint: string,
    public readonly status: number,
    message: string,
  ) {
    super(`[DEVS-FIRE ${endpoint}] ${status}: ${message}`);
    this.name = "DevsFireError";
  }
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Builds a query string from an object, omitting undefined values.
 */
function buildParams(params: Record<string, string | number | undefined>): string {
  const entries = Object.entries(params).filter(
    (entry): entry is [string, string | number] => entry[1] !== undefined,
  );
  if (entries.length === 0) return "";
  return "?" + entries.map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join("&");
}

/**
 * POST to a DEVS-FIRE endpoint and return the response body.
 * Throws `DevsFireError` on non-2xx responses.
 */
async function post<T>(endpoint: string, params: Record<string, string | number | undefined> = {}): Promise<T> {
  const url = `${DEVS_FIRE_BASE_URL}/${endpoint}/${buildParams(params)}`;
  let res: Response;

  try {
    res = await fetch(url, {
      method: "POST",
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Network request failed";
    throw new DevsFireError(
      endpoint,
      0,
      `Unable to reach DEVS-FIRE at ${DEVS_FIRE_BASE_URL} (${message})`,
    );
  }

  if (!res.ok) {
    const body = await res.text().catch(() => "No response body");
    throw new DevsFireError(endpoint, res.status, body);
  }

  const text = await res.text();

  // The API returns plain numbers for some endpoints (e.g. "100800.0"),
  // JSON arrays for others, and plain strings for the rest.
  try {
    return JSON.parse(text) as T;
  } catch {
    // Return raw text — caller's generic type should be `string` or `number`.
    // For number endpoints, parseFloat is handled by the caller.
    return text as unknown as T;
  }
}

// ---------------------------------------------------------------------------
// Session
// ---------------------------------------------------------------------------

/** Create a new simulation session. Returns a 32-character token. */
export async function connectToServer(): Promise<string> {
  return post<string>("connectToServer");
}

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

/** Set the simulation center location (must be within the US). */
export async function setCellSpaceLocation(
  userToken: string,
  lat: number,
  lng: number,
): Promise<string> {
  return post<string>("setCellSpaceLocation", { userToken, lat, lng });
}

/** Set wind speed (m/s) and direction (degrees, 0=south, clockwise). */
export async function setWindCondition(
  userToken: string,
  windSpeed?: number,
  windDirection?: number,
): Promise<string> {
  return post<string>("setWindCondition", { userToken, windSpeed, windDirection });
}

/** Set cell resolution (meters) and grid dimension (cells per side). */
export async function setCellResolution(
  userToken: string,
  cellResolution?: number,
  cellDimension?: number,
): Promise<string> {
  return post<string>("setCellResolution", { userToken, cellResolution, cellDimension });
}

/**
 * Configure multiple simulation parameters in a single call.
 * Sets location, wind, grid resolution, and optionally ignition point.
 */
export async function configureSimulation(
  userToken: string,
  config: SimulationConfig,
): Promise<void> {
  // Use individual calls for reliability — setMultiParameters has quirks
  // with optional fields. This also gives us per-step error messages.
  await setCellSpaceLocation(userToken, config.lat, config.lng);

  if (config.windSpeed !== undefined || config.windDirection !== undefined) {
    await setWindCondition(userToken, config.windSpeed, config.windDirection);
  }

  if (config.cellResolution !== undefined || config.cellDimension !== undefined) {
    await setCellResolution(userToken, config.cellResolution, config.cellDimension);
  }
}

// ---------------------------------------------------------------------------
// Ignition
// ---------------------------------------------------------------------------

/**
 * Set one or more simultaneous ignition points.
 * @param xs Comma-separated x coordinates (e.g. "120" or "50,100")
 * @param ys Comma-separated y coordinates (e.g. "120" or "50,100")
 */
export async function setPointIgnition(
  userToken: string,
  xs: string,
  ys: string,
): Promise<string> {
  return post<string>("setPointIgnition", { userToken, xs, ys });
}

/**
 * Set a burn team path segment (dynamic ignition / line ignition).
 * Call multiple times with the same teamNum for multi-segment paths.
 * Different teamNums run simultaneously.
 */
export async function setDynamicIgnition(
  userToken: string,
  config: BurnTeamConfig,
): Promise<string> {
  return post<string>("setDynamicIgnition", {
    userToken,
    teamNum: config.teamNum,
    x1: config.x1,
    y1: config.y1,
    x2: config.x2,
    y2: config.y2,
    speed: config.speed,
    mode: config.mode,
    distance: config.distance,
    waitTime: config.waitTime,
  });
}

// ---------------------------------------------------------------------------
// Fuel breaks (suppressed cells)
// ---------------------------------------------------------------------------

/**
 * Suppress a single cell or a line of cells between two points.
 * Suppressed cells will not burn during the simulation.
 */
export async function setSuppressedCell(
  userToken: string,
  segment: FuelBreakSegment,
): Promise<string> {
  return post<string>("setSuppressedCell", {
    userToken,
    x1: segment.x1,
    y1: segment.y1,
    x2: segment.x2,
    y2: segment.y2,
  });
}

// ---------------------------------------------------------------------------
// Simulation execution
// ---------------------------------------------------------------------------

/** Run a new simulation for the given number of seconds. */
export async function runSimulation(
  userToken: string,
  time: number,
): Promise<CellOperation[]> {
  return post<CellOperation[]>("runSimulation", { userToken, time });
}

/**
 * Continue an existing simulation by an additional time interval.
 * Allows running in steps with data collection between each.
 */
export async function continueSimulation(
  userToken: string,
  time: number,
): Promise<CellOperation[]> {
  return post<CellOperation[]>("continueSimulation", { userToken, time });
}

// ---------------------------------------------------------------------------
// Results
// ---------------------------------------------------------------------------

/** Get the fire perimeter cell coordinates. */
export async function getPerimeterCells(userToken: string): Promise<string[]> {
  return post<string[]>("getPerimeterCells", { userToken });
}

/** Get total burned area in square meters. */
export async function computeBurnedArea(userToken: string): Promise<number> {
  const result = await post<string>("computeBurnedArea", { userToken });
  return parseFloat(result);
}

/** Get fire perimeter length in kilometers. */
export async function computePerimeterLength(userToken: string): Promise<number> {
  const result = await post<string>("computePerimeterLength", { userToken });
  return parseFloat(result);
}

/** Get number of currently burning cells. */
export async function getBurningCellNum(userToken: string): Promise<number> {
  const result = await post<string>("getBurningCellNum", { userToken });
  return parseFloat(result);
}

/** Get number of unburned cells remaining. */
export async function getUnburnedCellNum(userToken: string): Promise<number> {
  const result = await post<string>("getUnburnedCellNum", { userToken });
  return parseFloat(result);
}

/**
 * Fetch all simulation results in a single call.
 * Runs 5 API calls in parallel for speed.
 */
export async function getResults(userToken: string): Promise<SimulationResults> {
  const [perimeterCells, burnedArea, perimeterLength, burningCells, unburnedCells] =
    await Promise.all([
      getPerimeterCells(userToken),
      computeBurnedArea(userToken),
      computePerimeterLength(userToken),
      getBurningCellNum(userToken),
      getUnburnedCellNum(userToken),
    ]);

  return { perimeterCells, burnedArea, perimeterLength, burningCells, unburnedCells };
}

// ---------------------------------------------------------------------------
// Terrain & grid info
// ---------------------------------------------------------------------------

/** Get the fuel type grid (2D array of fuel code integers). */
export async function getCellFuel(userToken: string): Promise<GridData> {
  return post<GridData>("getCellFuel", { userToken });
}

/** Get the slope grid (2D array of slope values). */
export async function getCellSlope(userToken: string): Promise<GridData> {
  return post<GridData>("getCellSlope", { userToken });
}

/** Get the aspect grid (2D array of aspect values in degrees). */
export async function getCellAspect(userToken: string): Promise<GridData> {
  return post<GridData>("getCellAspect", { userToken });
}

/** Fetch all terrain data (fuel, slope, aspect) in parallel. */
export async function getTerrainData(userToken: string): Promise<TerrainData> {
  const [fuel, slope, aspect] = await Promise.all([
    getCellFuel(userToken),
    getCellSlope(userToken),
    getCellAspect(userToken),
  ]);
  return { fuel, slope, aspect };
}

/** Get the grid dimension (number of cells per side). */
export async function getCellSpaceSize(userToken: string): Promise<number> {
  const result = await post<string>("getCellSpaceSize", { userToken });
  return parseFloat(result);
}

/** Get the cell resolution in meters. */
export async function getCellSize(userToken: string): Promise<number> {
  const result = await post<string>("getCellSize", { userToken });
  return parseFloat(result);
}

/** Get current wind speed in m/s. */
export async function getWindSpeed(userToken: string): Promise<number> {
  const result = await post<string>("getWindSpeed", { userToken });
  return parseFloat(result);
}

/** Get current wind direction in degrees. */
export async function getWindDegree(userToken: string): Promise<number> {
  const result = await post<string>("getWindDegree", { userToken });
  return parseFloat(result);
}

/** Fetch all simulation info (grid size, cell size, wind) in parallel. */
export async function getSimulationInfo(userToken: string): Promise<SimulationInfo> {
  const [cellSpaceSize, cellSize, windSpeed, windDegree] = await Promise.all([
    getCellSpaceSize(userToken),
    getCellSize(userToken),
    getWindSpeed(userToken),
    getWindDegree(userToken),
  ]);
  return { cellSpaceSize, cellSize, windSpeed, windDegree };
}
