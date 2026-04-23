import type { GridConfig } from "./draw-context";

// ---------------------------------------------------------------------------
// Lat/lng ↔ grid-cell coordinate translation
// ---------------------------------------------------------------------------

/** Approximate meters per degree of latitude (constant globally). */
const METERS_PER_DEG_LAT = 111_320;

/** Meters per degree of longitude at a given latitude. */
function metersPerDegLng(lat: number): number {
  return METERS_PER_DEG_LAT * Math.cos((lat * Math.PI) / 180);
}

/**
 * Convert a geographic coordinate (lat/lng) to a grid-cell (x, y).
 *
 * The grid center maps to (dim/2, dim/2).
 * x increases east, y increases north — matching the API convention.
 * Output is clamped to [0, dim-1].
 */
export function latlngToCell(
  config: GridConfig,
  lat: number,
  lng: number
): { x: number; y: number } {
  const half = config.cellDimension / 2;

  // Offset in meters from grid center
  const dEast = (lng - config.lng) * metersPerDegLng(config.lat);
  const dNorth = (lat - config.lat) * METERS_PER_DEG_LAT;

  // Convert to cell indices
  const x = Math.round(half + dEast / config.cellResolution);
  const y = Math.round(half + dNorth / config.cellResolution);

  // Clamp to valid range
  return {
    x: Math.max(0, Math.min(config.cellDimension - 1, x)),
    y: Math.max(0, Math.min(config.cellDimension - 1, y)),
  };
}

/**
 * Convert a grid-cell (x, y) to a geographic coordinate (lat/lng).
 *
 * Inverse of latlngToCell.
 */
export function cellToLatlng(
  config: GridConfig,
  x: number,
  y: number
): { lat: number; lng: number } {
  const half = config.cellDimension / 2;

  const dEast = (x - half) * config.cellResolution;
  const dNorth = (y - half) * config.cellResolution;

  return {
    lat: config.lat + dNorth / METERS_PER_DEG_LAT,
    lng: config.lng + dEast / metersPerDegLng(config.lat),
  };
}

/**
 * Check if a lat/lng point falls within the grid bounds.
 */
export function isInsideGrid(
  config: GridConfig,
  lat: number,
  lng: number
): boolean {
  const cell = latlngToCell(config, lat, lng);
  return (
    cell.x > 0 &&
    cell.x < config.cellDimension - 1 &&
    cell.y > 0 &&
    cell.y < config.cellDimension - 1
  );
}
