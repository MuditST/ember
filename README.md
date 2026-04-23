# 🔥 Ember

> An agentic wildfire simulation interface — translate natural language into real-time fire simulations.

Ember is a Claude-style chat agent that sits on top of the [DEVS-FIRE research API](https://firesim.cs.gsu.edu/api/) from Georgia State University's ACME Lab. Instead of manually configuring simulation parameters through forms, you describe scenarios in plain English and the AI agent orchestrates the entire pipeline — location, wind, ignition, fuel breaks, execution, and visualization.

---

## What It Does

- **Chat-driven simulation setup** — describe a fire scenario naturally ("Simulate a wildfire near Wichita, KS, wind blowing from the south at 10 mph") and the agent configures all parameters
- **Interactive map artifact** — real-time fire spread visualization on a dark-themed vector map with heatmap-style cell coloring
- **Draw-to-configure** — click to place ignition points, draw polylines for burn team paths and fuel breaks directly on the map
- **Dual input** — combine map drawing with natural language for precise control ("Use this line as a fuel break along the ridge")
- **Confirmation before execution** — the agent summarizes all parameters and waits for approval before running
- **Live results** — burned area, perimeter length, cell counts, and fire spread overlay rendered as the simulation completes

## Architecture

```
┌────────────────────────────────────────────────────────────────────┐
│  🔥 Ember                                                         │
├──────────────────────────────┬─────────────────────────────────────┤
│                              │                                     │
│   CHAT PANEL                 │   ARTIFACT PANEL                    │
│   (AI Elements + useChat)    │   (MapLibre + MapTiler)             │
│                              │                                     │
│   • Streaming messages       │   • Dark/Satellite/Hybrid styles    │
│   • Tool progress cards      │   • Fire spread heatmap             │
│   • Confirmation components  │   • Grid overlay                    │
│   • Suggestion chips         │   • Draw: points, lines, breaks     │
│                              │   • Stats dashboard                 │
│   ┌──────────────────────┐   │                                     │
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

The agent has 9 tools that map to DEVS-FIRE API endpoints:

| Tool | What It Does |
|------|-------------|
| `create_simulation` | Connects to server, gets session token |
| `configure_simulation` | Sets location, wind, grid resolution |
| `set_point_ignition` | Places ignition points on the grid |
| `set_burn_team` | Configures dynamic ignition paths (line ignition) |
| `set_fuel_break` | Suppresses cells to create firebreaks |
| `run_simulation` | Executes simulation (**requires user confirmation**) |
| `get_results` | Fetches burned area, perimeter, cell counts |
| `get_terrain_data` | Reads fuel, slope, and aspect data |
| `get_simulation_info` | Gets grid size, cell size, wind conditions |

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
3. Ember → configure_simulation()     → sets lat/lng, wind
4. Ember → "Where should the ignition be?"
5. User clicks map (or types coords)
6. Ember → set_point_ignition()       → places fire start
7. Ember → shows confirmation card    → user clicks "Run"
8. Ember → run_simulation(12000s)     → fire spreads
9. Ember → get_results()              → burned area, perimeter
10. Map renders fire heatmap + perimeter outline
11. Stats cards show results
12. User: "What if wind was 20 mph?"  → Ember re-runs
```

## Project Structure

```
app/
├── layout.tsx                  # Root layout, metadata
├── globals.css                 # Tailwind + fire gradient vars
├── page.tsx                    # Split layout (chat + map)
└── api/chat/route.ts           # ToolLoopAgent stream endpoint

components/
├── ai-elements/                # Installed via AI Elements CLI
├── chat/
│   ├── chat-panel.tsx          # Messages + input
│   ├── welcome-screen.tsx      # Initial centered welcome
│   ├── tool-renderers.tsx      # Per-tool UI components
│   └── confirmation-card.tsx   # Run simulation approval
└── map/
    ├── artifact-panel.tsx      # Right panel container
    ├── fire-map.tsx            # MapLibre + MapTiler
    ├── fire-overlay.tsx        # Fire spread heatmap
    ├── grid-overlay.tsx        # Simulation grid bounds
    ├── drawing-toolbar.tsx     # Point/line/break mode buttons
    ├── style-switcher.tsx      # Dark/satellite/hybrid toggle
    └── simulation-stats.tsx    # Result stats cards

lib/
├── agents/fire-agent.ts        # ToolLoopAgent definition
├── tools/                      # 9 tool definitions (Zod schemas)
├── devs-fire/
│   ├── client.ts               # Typed API client
│   └── types.ts                # Response types
├── prompts/system.ts           # System prompt
└── simulation-context.tsx      # Shared state (React Context)
```

## License

MIT — see [LICENSE](./LICENSE).

> **Note:** The [DEVS-FIRE simulation API](https://firesim.cs.gsu.edu/api/) is a research service provided by Georgia State University's ACME Lab. Ember is an independent open-source frontend; the API and its underlying models are the property of GSU.
