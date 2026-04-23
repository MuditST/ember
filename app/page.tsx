"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, isToolUIPart } from "ai";
import { Info, Moon, RotateCcw } from "lucide-react";
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
  PromptInputSubmit,
  PromptInputTextarea,
} from "@/components/ai-elements/prompt-input";
import { Suggestion } from "@/components/ai-elements/suggestion";
import {
  Tool,
  ToolContent,
  ToolHeader,
  ToolInput,
  ToolOutput,
} from "@/components/ai-elements/tool";
import { FireMap, type MapStyleKey } from "@/components/map/fire-map";
import { AgentFeatureOverlay } from "@/components/map/agent-feature-overlay";
import { DrawToolbar } from "@/components/map/draw-toolbar";
import { GridInfoBar } from "@/components/map/grid-info-bar";
import { GridOverlay, MapCrosshair } from "@/components/map/grid-overlay";
import { PlaybackBar } from "@/components/map/playback-bar";
import { SimulationOverlay } from "@/components/map/simulation-overlay";
import { StyleSwitcher } from "@/components/map/style-switcher";
import { ProgressiveBlur } from "@/components/ui/progressive-blur";
import { DrawProvider, useDraw } from "@/lib/draw/draw-context";
import type { CellOperation } from "@/lib/devs-fire/types";

const SUGGESTIONS = [
  // AI makes grid + ignition, runs it all
  "Wildfire in Angeles National Forest during Santa Ana winds",
  // AI sets up grid, user places ignition
  "Set up a fire scenario near Yellowstone — I'll place the ignition myself",
  // All-in-one: location, wind, ignition, duration, run
  "34.3N 118.1W, 15 m/s NE wind, ignition at center, 2 hours — run it",
  // User already drew features, just run
  "I've set everything up on the map — run the simulation",
];

const TOOL_LABELS: Record<string, string> = {
  "tool-create_simulation": "Creating Session",
  "tool-configure_simulation": "Configuring Simulation",
  "tool-set_point_ignition": "Setting Ignition Points",
  "tool-set_burn_team": "Configuring Burn Team",
  "tool-set_fuel_break": "Creating Fuel Break",
  "tool-run_simulation": "Running Simulation",
  "tool-get_terrain_data": "Analyzing Terrain",
};

export default function EmberPage() {
  return (
    <DrawProvider>
      <EmberPageInner />
    </DrawProvider>
  );
}

function EmberPageInner() {
  const [input, setInput] = useState("");
  const [mapStyle, setMapStyle] = useState<MapStyleKey | null>(null);
  const {
    getSpatialContext,
    gridConfig,
    recenterToGrid,
    setAgentFeatures,
    setGridConfig,
    setSimDuration,
    setSimPhase,
    setSimulationCells,
    setWindDirection,
    setWindSpeed,
    clearGrid,
    dismissSimulation,
    clearAgentFeatures,
  } = useDraw();

  const spatialContextRef = useRef(getSpatialContext);
  spatialContextRef.current = getSpatialContext;

  const [transport] = useState(
    () =>
      new DefaultChatTransport({
        api: "/api/chat",
        body: () => ({ spatialContext: spatialContextRef.current() }),
      }),
  );

  const { messages, sendMessage, setMessages, status } = useChat<FireAgentUIMessage>({
    transport,
    onFinish: ({ finishReason, isAbort, isDisconnect, isError, message }) => {
      console.log("[ember][client] chat:finish", {
        finishReason,
        isAbort,
        isDisconnect,
        isError,
        messageId: message.id,
        partTypes: message.parts.map((part) => part.type),
      });
    },
    onError: (error) => {
      console.error("[ember][client] chat:error", error);
    },
  });

  const lastGridSyncRef = useRef("");
  const lastRunSyncRef = useRef("");
  const lastIgnitionSyncRef = useRef("");
  const lastBurnSyncRef = useRef("");
  const lastBreakSyncRef = useRef("");

  useEffect(() => {
    for (const msg of messages) {
      if (msg.role !== "assistant" || !msg.parts) continue;

      for (const part of msg.parts) {
        if (
          part.type === "tool-configure_simulation" &&
          part.state === "output-available"
        ) {
          const output = part.output as
            | {
                location?: { lat: number; lng: number };
                wind?: {
                  speed: number | string;
                  direction: number | string;
                };
                grid?: { resolution: number; dimension: number };
              }
            | undefined;

          if (!output?.location) continue;

          const key = JSON.stringify(output);
          if (key === lastGridSyncRef.current) continue;
          lastGridSyncRef.current = key;

          setGridConfig({
            lat: output.location.lat,
            lng: output.location.lng,
            cellResolution: output.grid?.resolution ?? 30,
            cellDimension: output.grid?.dimension ?? 200,
          });

          if (output.wind) {
            if (typeof output.wind.speed === "number") {
              setWindSpeed(output.wind.speed);
            }

            if (typeof output.wind.direction === "number") {
              setWindDirection(output.wind.direction);
            }
          }


        }

        if (
          part.type === "tool-set_point_ignition" &&
          part.state === "output-available"
        ) {
          const output = part.output as
            | { points: Array<{ x: number; y: number }>; count: number }
            | undefined;

          if (!output?.points) continue;

          const key = `ignition-${msg.id}-${JSON.stringify(output.points)}`;
          if (key === lastIgnitionSyncRef.current) continue;
          lastIgnitionSyncRef.current = key;

          setAgentFeatures((prev) => ({
            ...prev,
            ignitions: [...prev.ignitions, ...output.points],
          }));
        }

        if (
          part.type === "tool-set_burn_team" &&
          part.state === "output-available"
        ) {
          const output = part.output as
            | {
                teamName: string;
                segments: Array<{
                  from: { x: number; y: number };
                  to: { x: number; y: number };
                }>;
              }
            | undefined;

          if (!output?.segments) continue;

          const key = `burn-${msg.id}-${output.teamName}`;
          if (key === lastBurnSyncRef.current) continue;
          lastBurnSyncRef.current = key;

          setAgentFeatures((prev) => ({
            ...prev,
            burnTeams: [
              ...prev.burnTeams,
              {
                teamName: output.teamName,
                segments: output.segments,
              },
            ],
          }));
        }

        if (
          part.type === "tool-set_fuel_break" &&
          part.state === "output-available"
        ) {
          const output = part.output as
            | {
                segments: Array<{
                  x1: number;
                  y1: number;
                  x2: number;
                  y2: number;
                }>;
              }
            | undefined;

          if (!output?.segments) continue;

          const key = `break-${msg.id}-${JSON.stringify(output.segments)}`;
          if (key === lastBreakSyncRef.current) continue;
          lastBreakSyncRef.current = key;

          setAgentFeatures((prev) => ({
            ...prev,
            fuelBreaks: [...prev.fuelBreaks, ...output.segments],
          }));
        }

        if (part.type === "tool-run_simulation") {
          if (
            part.state === "input-streaming" ||
            part.state === "input-available"
          ) {
            setSimPhase("running");
            // Clear agent feature preview — the heatmap overlay is now
            // the source of truth. This also removes any stale markers
            // from points the agent removed on the backend.
            clearAgentFeatures();
            // Sync the duration pill from the agent's chosen time
            const input = part.input as { time?: number } | undefined;
            if (input?.time && input.time > 0) {
              setSimDuration(input.time);
            }
          }

          if (part.state === "output-available") {
            const runKey = `${msg.id}-run`;
            if (runKey === lastRunSyncRef.current) continue;
            lastRunSyncRef.current = runKey;

            const output = part.output as
              | {
                  cells?: CellOperation[];
                  status?: string;
                  cellOperations?: number;
                  spreadCells?: number;
                  timeSimulated?: number;
                  mode?: string;
                  burnedAreaKm2?: number;
                  perimeterKm?: number;
                }
              | undefined;

            if (output?.status === "no_ignition" || output?.status === "no_spread") {
              if (output.cells) {
                setSimulationCells(output.cells);
              }
              setSimPhase("idle");
              continue;
            }

            if (output?.cells) {
              setSimulationCells(output.cells);
            } else {
              console.error("[ember][client] run_simulation missing cells payload");
              setSimPhase("idle");
            }
          }
        }
      }
    }
  }, [
    messages,
    clearAgentFeatures,
    recenterToGrid,
    setAgentFeatures,
    setGridConfig,
    setSimDuration,
    setSimPhase,
    setSimulationCells,
    setWindDirection,
    setWindSpeed,
  ]);

  // Auto-recenter map when grid config changes (agent placed or user moved)
  const prevGridRef = useRef<string>("");
  useEffect(() => {
    if (!gridConfig) return;
    const key = `${gridConfig.lat},${gridConfig.lng},${gridConfig.cellDimension}`;
    if (key === prevGridRef.current) return;
    prevGridRef.current = key;
    // Small delay to let the grid render before fitting bounds
    const t = setTimeout(() => recenterToGrid(), 150);
    return () => clearTimeout(t);
  }, [gridConfig, recenterToGrid]);

  const handleSubmit = (message: PromptInputMessage) => {
    if (!message.text.trim()) return;
    sendMessage({ text: message.text });
    setInput("");
  };

  const handleSuggestion = (suggestion: string) => {
    sendMessage({ text: suggestion });
  };

  const isEmpty = messages.length === 0;

  const handleNewSimulation = () => {
    // Reset all map state
    dismissSimulation();
    clearGrid();
    clearAgentFeatures();
    // Reset wind/duration to defaults
    setWindSpeed(3);
    setWindDirection(0);
    setSimDuration(3600);
    // Clear chat
    setMessages([]);
    // Clear sync refs
    lastGridSyncRef.current = "";
    lastRunSyncRef.current = "";
    lastIgnitionSyncRef.current = "";
    lastBurnSyncRef.current = "";
    lastBreakSyncRef.current = "";
    // Clear session cookie (HttpOnly, needs server call)
    fetch("/api/session/clear", { method: "POST" }).catch(() => {});
  };

  return (
    <div className="flex h-svh flex-col">
      <div className="flex min-h-0 flex-1">
        <div className="flex w-[40vw] shrink-0 flex-col xl:w-[30vw]">
          <header className="relative z-10 flex shrink-0 items-center gap-2 bg-background px-5 py-3">
            <Image
              src="/ember-logo.png"
              alt="Ember"
              width={24}
              height={24}
              className="size-6"
            />
            <span className="text-sm font-semibold tracking-wider">EMBER</span>

            <div className="ml-auto flex items-center gap-1">
              {!isEmpty && (
                <button
                  onClick={handleNewSimulation}
                  className="flex size-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  title="New Simulation"
                >
                  <RotateCcw className="size-4" />
                </button>
              )}
              <button
                className="flex size-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                title="Info"
              >
                <Info className="size-4" />
              </button>
              <button
                className="flex size-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                title="Toggle theme"
              >
                <Moon className="size-4" />
              </button>
            </div>
          </header>

          <div className="relative z-10 h-0">
            <ProgressiveBlur
              direction="top"
              blurLayers={3}
              blurIntensity={0.5}
              className="absolute inset-x-0 top-0 h-6 bg-linear-to-b from-background to-transparent"
            />
          </div>

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
                    {SUGGESTIONS.map((suggestion) => (
                      <Suggestion
                        key={suggestion}
                        suggestion={suggestion}
                        onClick={handleSuggestion}
                        className="h-auto w-full justify-start rounded-lg px-4 py-3 text-left text-[13px] whitespace-normal"
                      />
                    ))}
                  </div>
                </div>
              ) : (
                messages.map((message) => (
                  <Message from={message.role} key={message.id}>
                    <MessageContent>
                      {message.parts.map((part, index) => {
                        const key = `${message.id}-${index}`;

                        if (part.type === "text") {
                          return (
                            <MessageResponse key={key}>{part.text}</MessageResponse>
                          );
                        }

                        if (isToolUIPart(part)) {
                          const toolType = part.type as string;
                          const isRunTool = toolType === "tool-run_simulation";
                          const runOutput =
                            isRunTool && part.state === "output-available"
                              ? (part.output as
                                  | {
                                      cellOperations?: number;
                                      spreadCells?: number;
                                      timeSimulated?: number;
                                      mode?: string;
                                      status?: string;
                                      burnedAreaKm2?: number;
                                      perimeterKm?: number;
                                    }
                                  | undefined)
                              : undefined;

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
                                        {isRunTool
                                          ? [
                                              `Status: ${runOutput?.status ?? "unknown"}`,
                                              `Duration: ${Math.round((runOutput?.timeSimulated ?? 0) / 60)} min`,
                                              `Operations: ${runOutput?.cellOperations ?? 0}`,
                                              `Spread cells: ${runOutput?.spreadCells ?? 0}`,
                                              runOutput?.burnedAreaKm2 != null
                                                ? `Burned area: ${runOutput.burnedAreaKm2} km²`
                                                : null,
                                              runOutput?.perimeterKm != null
                                                ? `Perimeter: ${runOutput.perimeterKm} km`
                                                : null,
                                            ]
                                              .filter(Boolean)
                                              .join("\n")
                                          : `\`\`\`json\n${JSON.stringify(part.output, null, 2)}\n\`\`\``}
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

          <div className="relative z-10">
            <ProgressiveBlur
              direction="bottom"
              blurLayers={3}
              blurIntensity={0.5}
              className="absolute inset-x-0 -top-6 h-6 bg-linear-to-t from-background to-transparent"
            />

            <div className="bg-background px-4 pb-4 pt-2">
              <PromptInput onSubmit={handleSubmit} className="relative w-full">
                <PromptInputTextarea
                  value={input}
                  placeholder="Describe a fire scenario..."
                  onChange={(event) => setInput(event.currentTarget.value)}
                  className="pr-12"
                />
                <PromptInputSubmit
                  status={status === "streaming" ? "streaming" : "ready"}
                  disabled={!input.trim()}
                  className="absolute right-1 bottom-1"
                />
              </PromptInput>
            </div>
          </div>
        </div>

        <div className="w-px bg-border" />

        <div className="relative min-h-0 flex-1 overflow-hidden">
          <FireMap styleOverride={mapStyle} />
          <GridOverlay />
          <AgentFeatureOverlay />
          <SimulationOverlay />
          <MapCrosshair />

          <GridInfoBar className="absolute top-4 left-1/2 z-20 -translate-x-1/2" />
          <DrawToolbar className="absolute bottom-4 left-1/2 z-20 -translate-x-1/2" />
          <PlaybackBar className="absolute bottom-4 left-1/2 z-20 -translate-x-1/2" />

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
