import { createAgentUIStreamResponse, type UIMessage } from "ai";
import { cookies } from "next/headers";
import { createFireAgent } from "@/lib/agents/fire-agent";
import { DEVS_FIRE_BASE_URL } from "@/lib/devs-fire/client";
import type { SessionTokenRef } from "@/lib/tools";

// Allow agent loops up to 120 seconds (simulation API can be slow for long runs)
export const maxDuration = 120;

/** Cookie name for the DEVS-FIRE session token */
const SESSION_COOKIE = "ember_session";

const isDevelopment = process.env.NODE_ENV === "development";

function debugLog(...args: Parameters<typeof console.debug>) {
  if (isDevelopment) {
    console.debug(...args);
  }
}

/**
 * Validate a DEVS-FIRE session token by making a lightweight API call.
 * Returns true if the session is still active, false if expired/invalid.
 */
async function isTokenValid(token: string): Promise<boolean> {
  try {
    const res = await fetch(
      `${DEVS_FIRE_BASE_URL}/getCellSpaceSize/?userToken=${token}`,
      {
        method: "POST",
        signal: AbortSignal.timeout(8000),
      }
    );
    return res.ok;
  } catch {
    return false;
  }
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === "string") {
    return error;
  }

  try {
    return JSON.stringify(error);
  } catch {
    return "Unknown error";
  }
}

export async function POST(request: Request) {
  const requestId = crypto.randomUUID().slice(0, 8);
  const { messages, spatialContext } = (await request.json()) as {
    messages: UIMessage[];
    spatialContext?: string;
  };

  debugLog("[ember][chat] request:start", {
    requestId,
    messageCount: messages.length,
    spatialContextPreview: spatialContext?.slice(0, 160),
  });

  // Read existing session token from HTTP-only cookie (cross-turn continuity).
  const cookieStore = await cookies();
  let existingToken = cookieStore.get(SESSION_COOKIE)?.value ?? "";
  let shouldClearCookie = false;

  // Validate the token before handing it to the agent.
  // The DEVS-FIRE API expires sessions; a stale token causes 500 errors
  // and makes the agent retry in a chaotic loop. By validating upfront,
  // we let the agent know it needs to call create_simulation first.
  if (existingToken) {
    const valid = await isTokenValid(existingToken);
    if (!valid) {
      debugLog("[ember][chat] request:stale-token", {
        requestId,
        tokenPreview: existingToken.slice(0, 8),
      });
      existingToken = "";
      shouldClearCookie = true;
    }
  }

  // Create a mutable token ref, pre-filled from cookie (or empty if stale).
  const tokenRef: SessionTokenRef = { current: existingToken };

  // Build a request-scoped agent with token-bound tools.
  // Spatial context (drawn features) is injected into the system prompt
  // so the agent always knows the current map state.
  const agent = createFireAgent(tokenRef, spatialContext);

  const response = await createAgentUIStreamResponse({
    agent,
    uiMessages: messages,
    abortSignal: request.signal,
    onStepFinish: async ({ stepNumber, finishReason, toolCalls, toolResults, usage }) => {
      debugLog("[ember][chat] step:finish", {
        requestId,
        stepNumber,
        finishReason,
        inputTokens: usage.inputTokens,
        outputTokens: usage.outputTokens,
        totalTokens: usage.totalTokens,
        toolCalls: toolCalls.map((toolCall) => ({
          toolName: toolCall.toolName,
          toolCallId: toolCall.toolCallId,
        })),
        toolResults: toolResults.map((toolResult) => ({
          toolName: toolResult.toolName,
          toolCallId: toolResult.toolCallId,
          hasOutput: toolResult.output != null,
        })),
      });
    },
    onFinish: async ({ finishReason, isAborted, isContinuation, responseMessage }) => {
      debugLog("[ember][chat] request:finish", {
        requestId,
        finishReason,
        isAborted,
        isContinuation,
        responseMessageId: responseMessage.id,
        responsePartTypes: responseMessage.parts.map((part) => part.type),
        finalTokenPreview: tokenRef.current.slice(0, 8),
      });
    },
    onError: (error) => {
      const message = getErrorMessage(error);
      console.error("[ember][chat] request:error", {
        requestId,
        error: message,
      });
      return message;
    },
  });

  if (shouldClearCookie && !tokenRef.current) {
    response.headers.append(
      "Set-Cookie",
      `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0`
    );
  }

  // If create_simulation ran during this request, persist the new token.
  // The cookie is HTTP-only (not accessible via JS) and same-site strict.
  if (tokenRef.current && tokenRef.current !== existingToken) {
    response.headers.append(
      "Set-Cookie",
      `${SESSION_COOKIE}=${tokenRef.current}; Path=/; HttpOnly; SameSite=Strict; Max-Age=3600`
    );
    debugLog("[ember][chat] request:set-cookie", {
      requestId,
      tokenPreview: tokenRef.current.slice(0, 8),
    });
  }

  return response;
}
