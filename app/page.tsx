"use client";

import { useState } from "react";
import { useChat } from "@ai-sdk/react";
import {
  DefaultChatTransport,
  isToolUIPart,
  lastAssistantMessageIsCompleteWithApprovalResponses,
} from "ai";
import { Flame, CheckIcon, XIcon } from "lucide-react";
import type { FireAgentUIMessage } from "@/lib/agents/fire-agent";

import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import {
  Message,
  MessageContent,
  MessageResponse,
} from "@/components/ai-elements/message";
import {
  PromptInput,
  type PromptInputMessage,
  PromptInputTextarea,
  PromptInputSubmit,
} from "@/components/ai-elements/prompt-input";
import { Suggestion, Suggestions } from "@/components/ai-elements/suggestion";
import {
  Tool,
  ToolContent,
  ToolHeader,
  ToolInput,
  ToolOutput,
} from "@/components/ai-elements/tool";
import {
  Confirmation,
  ConfirmationRequest,
  ConfirmationAccepted,
  ConfirmationRejected,
  ConfirmationActions,
  ConfirmationAction,
} from "@/components/ai-elements/confirmation";

// ---------------------------------------------------------------------------
// Transport — single instance, reused across renders
// ---------------------------------------------------------------------------

const transport = new DefaultChatTransport({ api: "/api/chat" });

// ---------------------------------------------------------------------------
// Starter suggestions
// ---------------------------------------------------------------------------

const SUGGESTIONS = [
  "Simulate a wildfire near Los Angeles",
  "Run a fire scenario in Yellowstone with strong winds",
  "Show me what a prescribed burn looks like",
  "Create a simulation with a fuel break",
];

// ---------------------------------------------------------------------------
// Tool display name mapping
// ---------------------------------------------------------------------------

const TOOL_LABELS: Record<string, string> = {
  "tool-create_simulation": "Creating Session",
  "tool-configure_simulation": "Configuring Simulation",
  "tool-set_point_ignition": "Setting Ignition Points",
  "tool-set_burn_team": "Configuring Burn Team",
  "tool-set_fuel_break": "Creating Fuel Break",
  "tool-run_simulation": "Running Simulation",
  "tool-get_results": "Fetching Results",
  "tool-get_terrain_data": "Analyzing Terrain",
  "tool-get_simulation_info": "Getting Info",
};

// ---------------------------------------------------------------------------
// Chat component
// ---------------------------------------------------------------------------

export default function ChatPage() {
  const [input, setInput] = useState("");

  const { messages, sendMessage, status, addToolApprovalResponse } =
    useChat<FireAgentUIMessage>({
      transport,
      sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithApprovalResponses,
    });

  const handleSubmit = (message: PromptInputMessage) => {
    if (!message.text.trim()) return;
    sendMessage({ text: message.text });
    setInput("");
  };

  const handleSuggestion = (suggestion: string) => {
    sendMessage({ text: suggestion });
  };

  const isEmpty = messages.length === 0;

  return (
    <div className="flex h-svh flex-col">
      {/* ─── Conversation area ─── */}
      <Conversation className="flex-1 min-h-0">
        <ConversationContent className="mx-auto w-full max-w-2xl px-4 py-8">
          {isEmpty ? (
            <div className="flex h-full flex-col items-center justify-center gap-6">
              <ConversationEmptyState
                icon={
                  <div className="rounded-2xl bg-primary/10 p-4">
                    <Flame className="size-10 text-primary" />
                  </div>
                }
                title="Ember"
                description="AI-powered wildfire simulation. Describe a scenario and I'll configure, run, and analyze it."
              />
              <Suggestions className="max-w-xl">
                {SUGGESTIONS.map((s) => (
                  <Suggestion
                    key={s}
                    suggestion={s}
                    onClick={handleSuggestion}
                  />
                ))}
              </Suggestions>
            </div>
          ) : (
            messages.map((message) => (
              <Message from={message.role} key={message.id}>
                <MessageContent>
                  {message.parts.map((part, i) => {
                    const key = `${message.id}-${i}`;

                    // ── Text ──
                    if (part.type === "text") {
                      return (
                        <MessageResponse key={key}>
                          {part.text}
                        </MessageResponse>
                      );
                    }

                    // ── Tool: run_simulation (needs approval) ──
                    if (part.type === "tool-run_simulation" && part.approval) {
                      return (
                        <div key={key} className="space-y-2">
                          <Tool>
                            <ToolHeader
                              type={part.type}
                              state={part.state}
                              title={TOOL_LABELS[part.type] ?? part.type}
                            />
                            <ToolContent>
                              <ToolInput input={part.input} />
                              {part.state === "output-available" && (
                                <ToolOutput
                                  output={
                                    <MessageResponse>
                                      {`Simulated ${part.output?.timeSimulated ?? 0}s — ${part.output?.cellOperations ?? 0} cell operations (${part.output?.mode ?? "run"} mode)`}
                                    </MessageResponse>
                                  }
                                  errorText={part.errorText}
                                />
                              )}
                            </ToolContent>
                          </Tool>
                          <Confirmation
                            approval={part.approval}
                            state={part.state}
                          >
                            <ConfirmationRequest>
                              <span className="font-medium">
                                Run simulation for{" "}
                                {part.input?.time
                                  ? `${Math.round(part.input.time / 3600)}h`
                                  : "the specified duration"}
                                ?
                              </span>
                            </ConfirmationRequest>
                            <ConfirmationAccepted>
                              <CheckIcon className="size-4" />
                              <span>Simulation approved and running</span>
                            </ConfirmationAccepted>
                            <ConfirmationRejected>
                              <XIcon className="size-4" />
                              <span>Simulation cancelled</span>
                            </ConfirmationRejected>
                            <ConfirmationActions>
                              <ConfirmationAction
                                variant="outline"
                                onClick={() =>
                                  addToolApprovalResponse({
                                    id: part.approval!.id,
                                    approved: false,
                                  })
                                }
                              >
                                Cancel
                              </ConfirmationAction>
                              <ConfirmationAction
                                variant="default"
                                onClick={() =>
                                  addToolApprovalResponse({
                                    id: part.approval!.id,
                                    approved: true,
                                  })
                                }
                              >
                                Run Simulation
                              </ConfirmationAction>
                            </ConfirmationActions>
                          </Confirmation>
                        </div>
                      );
                    }

                    // ── Generic tool invocation ──
                    if (isToolUIPart(part)) {
                      // Derive a readable tool name from the part type
                      const toolType = part.type as string;

                      return (
                        <Tool key={key}>
                          <ToolHeader
                            type={toolType as `tool-${string}`}
                            state={part.state}
                            title={TOOL_LABELS[toolType] ?? toolType}
                          />
                          <ToolContent>
                            <ToolInput input={part.input} />
                            {part.state === "output-available" && (
                              <ToolOutput
                                output={
                                  <MessageResponse>
                                    {`\`\`\`json\n${JSON.stringify(part.output, null, 2)}\n\`\`\``}
                                  </MessageResponse>
                                }
                                errorText={part.errorText}
                              />
                            )}
                          </ToolContent>
                        </Tool>
                      );
                    }

                    return null;
                  })}
                </MessageContent>
              </Message>
            ))
          )}
        </ConversationContent>
        <ConversationScrollButton />
      </Conversation>

      {/* ─── Input area ─── */}
      <div className="border-t bg-background px-4 py-4">
        <PromptInput
          onSubmit={handleSubmit}
          className="mx-auto w-full max-w-2xl relative"
        >
          <PromptInputTextarea
            value={input}
            placeholder="Describe a fire scenario…"
            onChange={(e) => setInput(e.currentTarget.value)}
            className="pr-12"
          />
          <PromptInputSubmit
            status={status === "streaming" ? "streaming" : "ready"}
            disabled={!input.trim()}
            className="absolute bottom-1 right-1"
          />
        </PromptInput>
      </div>
    </div>
  );
}
