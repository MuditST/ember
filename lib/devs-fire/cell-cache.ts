import type { CellOperation } from "./types";

// ---------------------------------------------------------------------------
// Server-side cell operation cache
// ---------------------------------------------------------------------------
// Stores the raw CellOperation[] from runSimulation, keyed by session token.
// The tool stores data here; the UI fetches it via /api/simulation/cells.
// This keeps the agent context clean (only a summary goes back to the model).
// ---------------------------------------------------------------------------

const cellCache = new Map<string, CellOperation[]>();

/** Store cell operations for a session. */
export function setCachedCells(token: string, cells: CellOperation[]): void {
  cellCache.set(token, cells);
}

/** Retrieve cached cell operations for a session. Returns null if not found. */
export function getCachedCells(token: string): CellOperation[] | null {
  return cellCache.get(token) ?? null;
}

/** Clear cached cells for a session. */
export function clearCachedCells(token: string): void {
  cellCache.delete(token);
}
