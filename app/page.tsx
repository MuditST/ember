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
import { Suggestion } from "@/components/ai-elements/suggestion";
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
import { ProgressiveBlur } from "@/components/ui/progressive-blur";
import { FireMap, type MapStyleKey } from "@/components/map/fire-map";
import { StyleSwitcher } from "@/components/map/style-switcher";

// ---------------------------------------------------------------------------
// Transport — single instance, reused across renders
// ---------------------------------------------------------------------------

const transport = new DefaultChatTransport({ api: "/api/chat" });

// ---------------------------------------------------------------------------
// Starter suggestions
// ---------------------------------------------------------------------------

const SUGGESTIONS = [
  "Wildfire near Los Angeles during Santa Ana winds",
  "44.4°N, 110.6°W — wind 15 m/s from the southwest, 200×200 grid",
  "Prescribed burn with a fuel break along the northern edge",
  "Fire in the Colorado Rockies, you pick the best conditions",
  "Compare spread with and without a burn team near Austin, TX",
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
// Page
// ---------------------------------------------------------------------------

export default function EmberPage() {
  const [input, setInput] = useState("");
  const [mapStyle, setMapStyle] = useState<MapStyleKey | null>(null);

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
      {/* ─── Split Layout ─── */}
      <div className="flex flex-1 min-h-0">
        {/* ═══════════════════════════════════════════════════════════════ */}
        {/*  CHAT PANEL (left)                                            */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        <div className="flex w-[40vw] xl:w-[30vw] shrink-0 flex-col">
          {/* ── Solid header ── */}
          <header className="relative z-10 flex shrink-0 items-center gap-2 bg-background px-5 py-3">
            <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10">
              <Flame className="size-4 text-primary" />
            </div>
            <span className="text-sm font-semibold tracking-tight">Ember</span>
          </header>

          {/* Thin blur below header (fades into conversation) */}
          <div className="relative z-10 h-0">
            <ProgressiveBlur
              direction="top"
              blurLayers={3}
              blurIntensity={0.5}
              className="absolute inset-x-0 top-0 h-6 bg-linear-to-b from-background to-transparent"
            />
          </div>

          {/* ── Conversation (scrollable, bounded between header & input) ── */}
          <Conversation className="flex-1 min-h-0">
            <ConversationContent className="w-full px-4 pb-4">
              {isEmpty ? (
                <div className="flex h-full flex-col items-start justify-center gap-8 px-2 pt-4">
                  <div className="space-y-2">
                    <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
                      Ember Agent
                    </p>
                    <h2 className="text-lg font-medium tracking-tight text-foreground">
                      What wildfire scenario would
                      <br />
                      you like to simulate?
                    </h2>
                  </div>
                  <div className="flex w-full flex-col gap-2">
                    {SUGGESTIONS.map((s) => (
                      <Suggestion
                        key={s}
                        suggestion={s}
                        onClick={handleSuggestion}
                        className="w-full justify-start text-left whitespace-normal h-auto rounded-lg px-4 py-3 text-[13px]"
                      />
                    ))}
                  </div>
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

          {/* ── Bottom blur + input ── */}
          <div className="relative z-10">
            {/* Blur above input */}
            <ProgressiveBlur
              direction="bottom"
              blurLayers={3}
              blurIntensity={0.5}
              className="absolute inset-x-0 -top-6 h-6 bg-linear-to-t from-background to-transparent"
            />
            <div className="bg-background px-4 pb-4 pt-2">
              <PromptInput onSubmit={handleSubmit} className="w-full relative">
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
        </div>

        {/* ─── Divider ─── */}
        <div className="w-px bg-border" />

        {/* ═══════════════════════════════════════════════════════════════ */}
        {/*  MAP PANEL (right)                                            */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        <div className="relative flex-1 min-h-0">
          <FireMap styleOverride={mapStyle} />

          {/* Style switcher overlay */}
          <StyleSwitcher
            activeStyle={mapStyle}
            onStyleChange={setMapStyle}
            className="absolute bottom-4 left-4 z-10"
          />
        </div>
      </div>
    </div>
  );
}
