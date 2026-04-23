import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getCachedCells } from "@/lib/devs-fire/cell-cache";

const SESSION_COOKIE = "ember_session";

/**
 * POST /api/simulation/cells
 *
 * Returns the cached CellOperation[] for the current session.
 * The UI calls this after detecting run_simulation completion
 * to get the raw data for visualization without polluting the agent context.
 */
export async function POST() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;

  if (!token) {
    return NextResponse.json(
      { error: "No active session" },
      { status: 401 }
    );
  }

  const cells = getCachedCells(token);
  if (!cells) {
    return NextResponse.json(
      { error: "No simulation results cached" },
      { status: 404 }
    );
  }

  return NextResponse.json(cells);
}
