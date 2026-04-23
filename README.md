# 🔥 Ember

> An agentic wildfire simulation interface — translate natural language into real-time fire simulations.

Ember is a chat agent that sits on top of the [DEVS-FIRE research API](https://firesim.cs.gsu.edu/api/) from Georgia State University's ACME Lab. Instead of manually configuring simulation parameters through forms, you describe scenarios in plain English and the AI agent orchestrates the entire pipeline — location, wind, ignition, fuel breaks, execution, and visualization.

---

## What It Does

- **Chat-driven simulation setup** — describe a fire scenario naturally ("Simulate a wildfire near Wichita, KS, wind blowing from the south at 10 mph") and the agent configures all parameters
- **Interactive map artifact** — real-time fire spread visualization on a dark-themed vector map with heatmap-style cell coloring
- **Draw-to-configure** — click to place ignition points, draw polylines for burn team paths and fuel breaks directly on the map
- **Dual input** — combine map drawing with natural language for precise control ("Use this line as a fuel break along the ridge")
- **Confirm-before-run** — the agent summarizes all parameters and waits for explicit user confirmation before executing
- **Live results** — burned area, perimeter length, cell counts, and fire spread overlay rendered as the simulation completes
- **Playback controls** — scrub through the fire spread timeline with play/pause, speed control, and seek

## Architecture

```
┌────────────────────────────────────────────────────────────────────┐
│  🔥 Ember                                                         │
├──────────────────────────────┬─────────────────────────────────────┤
│                              │                                     │
│   CHAT PANEL                 │   MAP PANEL                         │
│   (AI Elements + useChat)    │   (MapLibre + MapTiler)             │
│                              │                                     │
│   • Streaming messages       │   • Dark/Satellite/Hybrid styles    │
│   • Tool progress cards      │   • Fire spread heatmap overlay     │
│   • Suggestion chips         │   • Grid overlay                    │
│   • Agent feature sync       │   • Draw: points, lines, breaks     │
│                              │   • Agent feature preview layer     │
│   ┌──────────────────────┐   │   • Playback bar + timeline         │
│   │ 🔥 Ask anything...   │   │                                     │
│   └──────────────────────┘   │                                     │
└──────────────────────────────┴─────────────────────────────────────┘
```

The agent receives user messages, reasons about what tools to call, executes them against the DEVS-FIRE API server-side, and streams results back — all in a single conversation turn.

```
User Message → Gemini 3 Flash (ToolLoopAgent) → Tool Calls → DEVS-FIRE API → Streamed Results → Map + Chat
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Framework** | [Next.js 16](https://nextjs.org/) (App Router, Turbopack) |
| **Styling** | [Tailwind CSS 4](https://tailwindcss.com/) + [shadcn/ui](https://ui.shadcn.com/) (Amber theme, Geist font) |
| **Chat UI** | [AI Elements](https://elements.ai-sdk.dev/) (Conversation, Message, PromptInput, Tool, Suggestion) |
| **AI** | [Vercel AI SDK v6](https://ai-sdk.dev/) + [Google Vertex AI](https://cloud.google.com/vertex-ai) (Gemini 3 Flash) |
| **Agent** | `ToolLoopAgent` with `InferAgentUIMessage` for end-to-end type safety |
| **Map Renderer** | [react-map-gl](https://visgl.github.io/react-map-gl/) + [MapLibre GL JS](https://maplibre.org/) |
| **Map Tiles** | [MapTiler](https://www.maptiler.com/) (dark, satellite, hybrid styles) |
| **Map Drawing** | [Terra Draw](https://terradraw.io/) (points, polylines for burn teams + fuel breaks) |
| **Simulation API** | [DEVS-FIRE REST API](https://firesim.cs.gsu.edu/api/) (GSU ACME Lab) |

## Agent Tools

The agent has 7 tools that map to DEVS-FIRE API endpoints:

| Tool | What It Does |
|------|-------------|
| `create_simulation` | Connects to server, gets session token |
| `configure_simulation` | Sets location, wind, grid resolution |
| `set_point_ignition` | Places ignition points on the grid |
| `set_burn_team` | Configures dynamic ignition paths (line ignition) |
| `set_fuel_break` | Suppresses cells to create firebreaks |
| `run_simulation` | Executes simulation + returns results (burned area, perimeter, raw cells) |
| `get_terrain_data` | Reads fuel, slope, and aspect data |

> **Note:** `run_simulation` returns post-run statistics (burned area, perimeter) and raw cell operations inline. There is no separate `get_results` tool — this prevents premature API calls that would 500 before the run completes.

## Getting Started

### Prerequisites

- Node.js 18+
- pnpm

### Environment Variables

Create a `.env` file:

```bash
GOOGLE_VERTEX_API_KEY=your_vertex_ai_api_key
NEXT_PUBLIC_MAPTILER_KEY=your_maptiler_api_key
```

- **Vertex AI**: [Get an API key](https://console.cloud.google.com/vertex-ai) (Express Mode — just an API key, no project/location needed)
- **MapTiler**: [Free account](https://cloud.maptiler.com/account/keys/) (100k loads/month, no credit card)

### Install & Run

```bash
pnpm install
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

## Design Philosophy

Built following [Emil Kowalski's](https://emilkowal.ski/) design engineering principles:

- **Boxy/blocky aesthetic** — clean, structured components
- **Amber accent palette** — fire-themed, harmonious with dark mode
- **Spring animations** — button press `scale(0.97)`, panel slide-in 250ms ease-out
- **No animation on keyboard actions** — send message doesn't bounce
- **Reduced motion respected** — `prefers-reduced-motion` → fade only

## How the Simulation Pipeline Works

```
1. User: "Simulate a fire near Atlanta, GA"
2. Ember → create_simulation()        → gets session token
3. Ember → configure_simulation()     → sets lat/lng, wind, grid
4. Ember → "Where should the ignition be?"
5. User clicks map (or types coords)
6. Ember → set_point_ignition()       → places fire start
7. Ember → summarizes config          → "Ready to run?"
8. User: "Yes, run it"
9. Ember → run_simulation(3600s)      → returns cells + stats
10. Map renders fire heatmap + playback bar appears
11. User scrubs timeline to watch fire spread
12. User: "What if wind was 20 mph?"  → Ember reconfigures & re-runs
```

## Key UX Features

- **Auto-recenter**: Map automatically fits to the grid bounds when the agent places a new grid
- **Draw mode gating**: Drawing tools are disabled during simulation — the user can't accidentally place points during playback
- **Duration sync**: When the agent changes the simulation duration, the UI pill updates to match
- **New Simulation**: Reset button in the header clears everything (chat, grid, features, session) for a fresh start
- **Dismiss & adjust**: Close the playback bar to return to idle state with grid/wind preserved for re-runs
- **Session reuse**: The agent reuses the existing session across conversation turns via HTTP-only cookies
- **Agent feature preview**: Ignition points, burn team paths, and fuel breaks placed by the agent appear as colored markers on the map before the simulation runs

## Project Structure

```
app/
├── layout.tsx                  # Root layout, metadata
├── globals.css                 # Tailwind + fire gradient vars
├── page.tsx                    # Split layout (chat + map) + agent sync
└── api/
    ├── chat/route.ts           # ToolLoopAgent stream endpoint
    └── session/clear/route.ts  # Clears session cookie (for reset)

components/
├── ai-elements/                # Installed via AI Elements CLI
└── map/
    ├── fire-map.tsx            # MapLibre + MapTiler
    ├── simulation-overlay.tsx  # Fire spread heatmap (canvas)
    ├── agent-feature-overlay.tsx # Agent-placed ignitions/paths preview
    ├── grid-overlay.tsx        # Simulation grid bounds + crosshair
    ├── draw-toolbar.tsx        # Point/line/break mode buttons
    ├── grid-info-bar.tsx       # Wind, duration, grid pills + popovers
    ├── playback-bar.tsx        # Play/pause, scrub, speed, dismiss
    └── style-switcher.tsx      # Dark/satellite/hybrid toggle

lib/
├── agents/fire-agent.ts        # ToolLoopAgent definition + type export
├── tools/                      # 7 tool definitions (Zod schemas)
│   ├── create-simulation.ts    # Session creation + token ref
│   ├── configure-simulation.ts # Location, wind, grid setup
│   ├── set-point-ignition.ts   # Point ignition placement
│   ├── set-burn-team.ts        # Line ignition (burn team paths)
│   ├── set-fuel-break.ts       # Fuel break lines
│   ├── run-simulation.ts       # Run + inline stats + raw cells
│   ├── get-terrain-data.ts     # Terrain analysis
│   └── index.ts                # Barrel exports
├── devs-fire/
│   ├── client.ts               # Typed API client
│   ├── cell-cache.ts           # Server-side cell cache
│   └── types.ts                # Response types
├── draw/
│   ├── draw-context.tsx        # Shared state (React Context) — grid, wind, sim, features
│   └── grid-math.ts            # Grid bounds + coordinate math
└── prompts/system.ts           # System prompt
```

## License

MIT — see [LICENSE](./LICENSE).

> **Note:** The [DEVS-FIRE simulation API](https://firesim.cs.gsu.edu/api/) is a research service provided by Georgia State University's ACME Lab. Ember is an independent open-source frontend; the API and its underlying models are the property of GSU.
