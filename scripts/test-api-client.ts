/**
 * Test script — runs a full simulation cycle through the DEVS-FIRE API client.
 *
 * Usage: npx tsx scripts/test-api-client.ts
 */

import * as api from "../lib/devs-fire/client";

async function main() {
  console.log("=== DEVS-FIRE API Client Test ===\n");

  // 1. Connect
  console.log("1. Connecting to server...");
  const token = await api.connectToServer();
  console.log(`   Token: ${token}\n`);

  // 2. Configure — Wichita, KS area
  console.log("2. Configuring simulation...");
  await api.configureSimulation(token, {
    lat: 37.24318,
    lng: -99.03919,
    windSpeed: 8,
    windDirection: 90,
  });
  console.log("   Location, wind set.\n");

  // 3. Check simulation info
  console.log("3. Fetching simulation info...");
  const info = await api.getSimulationInfo(token);
  console.log(`   Grid: ${info.cellSpaceSize}×${info.cellSpaceSize}`);
  console.log(`   Cell size: ${info.cellSize}m`);
  console.log(`   Wind: ${info.windSpeed} m/s @ ${info.windDegree}°\n`);

  // 4. Set point ignition
  console.log("4. Setting ignition at (100, 100)...");
  const ignitionResult = await api.setPointIgnition(token, "100", "100");
  console.log(`   ${ignitionResult}\n`);

  // 5. Set a burn team path
  console.log("5. Setting burn team path...");
  const burnResult = await api.setDynamicIgnition(token, {
    teamNum: "team0",
    x1: 110,
    y1: 110,
    x2: 130,
    y2: 130,
    speed: 0.4,
  });
  console.log(`   ${burnResult}\n`);

  // 6. Set a fuel break
  console.log("6. Setting fuel break...");
  const breakResult = await api.setSuppressedCell(token, {
    x1: 90,
    y1: 100,
    x2: 90,
    y2: 140,
  });
  console.log(`   ${breakResult}\n`);

  // 7. Run simulation
  console.log("7. Running simulation (1500s)...");
  const cells = await api.runSimulation(token, 1500);
  console.log(`   Returned ${cells.length} cell operations.`);
  if (cells.length > 0) {
    console.log(`   First: (${cells[0].x}, ${cells[0].y}) @ t=${cells[0].time}`);
    console.log(`   Last:  (${cells[cells.length - 1].x}, ${cells[cells.length - 1].y}) @ t=${cells[cells.length - 1].time}`);
  }
  console.log();

  // 8. Get results
  console.log("8. Fetching results...");
  const results = await api.getResults(token);
  console.log(`   Burned area:     ${results.burnedArea.toLocaleString()} m²`);
  console.log(`   Perimeter:       ${results.perimeterLength} km`);
  console.log(`   Burning cells:   ${results.burningCells}`);
  console.log(`   Unburned cells:  ${results.unburnedCells.toLocaleString()}`);
  console.log(`   Perimeter cells: ${results.perimeterCells.length}\n`);

  // 9. Continue simulation
  console.log("9. Continuing simulation (+3000s)...");
  const moreCells = await api.continueSimulation(token, 3000);
  console.log(`   Returned ${moreCells.length} additional cell operations.\n`);

  // 10. Get updated results
  console.log("10. Fetching updated results...");
  const results2 = await api.getResults(token);
  console.log(`   Burned area:     ${results2.burnedArea.toLocaleString()} m²`);
  console.log(`   Perimeter:       ${results2.perimeterLength} km`);
  console.log(`   Burning cells:   ${results2.burningCells}`);
  console.log(`   Unburned cells:  ${results2.unburnedCells.toLocaleString()}\n`);

  console.log("=== All tests passed ===");
}

main().catch((err) => {
  console.error("FAILED:", err);
  process.exit(1);
});
