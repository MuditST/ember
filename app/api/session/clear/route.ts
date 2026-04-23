import { cookies } from "next/headers";
import { NextResponse } from "next/server";

/**
 * POST /api/session/clear — Clears the ember_session HTTP-only cookie.
 * Called by the client "New Simulation" button.
 */
export async function POST() {
  const cookieStore = await cookies();
  cookieStore.delete("ember_session");
  return NextResponse.json({ ok: true });
}
