import { createAgentUIStreamResponse, type UIMessage } from "ai";
import { cookies } from "next/headers";
import { createFireAgent } from "@/lib/agents/fire-agent";
import type { SessionTokenRef } from "@/lib/tools";

// Allow agent loops up to 60 seconds (simulation API can be slow)
export const maxDuration = 60;

/** Cookie name for the DEVS-FIRE session token */
const SESSION_COOKIE = "ember_session";

export async function POST(request: Request) {
  const { messages, spatialContext } = (await request.json()) as {
    messages: UIMessage[];
    spatialContext?: string;
  };

  // Read existing session token from HTTP-only cookie (cross-turn continuity).
  // The token never appears in client message history — it's server-side only.
  const cookieStore = await cookies();
  const existingToken = cookieStore.get(SESSION_COOKIE)?.value ?? "";

  // Create a mutable token ref, pre-filled from cookie.
  // If this is a fresh conversation, the token starts empty and
  // create_simulation will populate it within the first agent step.
  const tokenRef: SessionTokenRef = { current: existingToken };

  // Build a request-scoped agent with token-bound tools.
  // Spatial context (drawn features) is injected into the system prompt
  // so the agent always knows the current map state.
  const agent = createFireAgent(tokenRef, spatialContext);

  const response = await createAgentUIStreamResponse({
    agent,
    uiMessages: messages,
  });

  // If create_simulation ran during this request, persist the new token.
  // The cookie is HTTP-only (not accessible via JS) and same-site strict.
  if (tokenRef.current && tokenRef.current !== existingToken) {
    response.headers.append(
      "Set-Cookie",
      `${SESSION_COOKIE}=${tokenRef.current}; Path=/; HttpOnly; SameSite=Strict; Max-Age=3600`
    );
  }

  return response;
}
