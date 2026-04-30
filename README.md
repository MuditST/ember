# Ember

Ember is an agentic wildfire simulation interface for configuring, running, visualizing, and analyzing DEVS-FIRE wildfire simulations. Users can describe scenarios in natural language while still retaining direct manual control over the map, grid, wind, ignition points, burn-team paths, and fuel breaks.

Live demo: https://ember.tushir.com/

DEVS-FIRE API reference: https://sims.cs.gsu.edu/sims/research/DEVSFIRE_API.html

## Overview

Ember turns the DEVS-FIRE simulation API into a conversational web application. Instead of forcing the user to manually translate a fire scenario into API parameters, Ember lets the user describe the scenario in plain English, draw or edit simulation features on a map, run the simulation, visualize the fire spread, and then explain the results in the same chat.

The interface combines an AI-driven workflow with full manual controls: users can place grids, set wind and duration, click ignition points, draw burn-team paths, draw fuel breaks, and replay the simulation timeline.

## Core Features

- Natural-language simulation setup through an AI agent
- Interactive MapLibre map with light and dark themes
- Manual grid placement, wind configuration, and duration controls
- Point ignitions, line ignitions, and fuel breaks drawn directly on the map
- Agent-readable map state, so user-drawn features can be used in tool calls
- DEVS-FIRE session continuity through an HTTP-only cookie
- Simulation execution through server-side tool calls
- Fire-spread heatmap overlay with playback controls
- Post-run summaries with burned area, perimeter, duration, wind, and qualitative analysis
- Follow-up conversation for scenario changes and result interpretation

## Architecture

```text
User
  |
  | chat text + map drawings
  v
Next.js UI
  |                         |
  | spatial context          | fire cells / grid / playback state
  v                         v
AI SDK ToolLoopAgent ---> DEVS-FIRE tools ---> DEVS-FIRE REST API
  |
  | streamed tool progress + final response
  v
Chat panel + map visualization
```

The important design choice is that the agent and map share state. The map context converts drawn geometry into grid coordinates and injects that state into the agent prompt on each turn. The agent can then call the same DEVS-FIRE operations a manual user would call, but with reasoning and explanation layered on top.

## Simulation Flow

1. The user asks for a scenario, such as "Simulate a grass fire near Wichita with strong south winds."
2. The agent creates or reuses a DEVS-FIRE session.
3. The agent configures the simulation location, wind, cell resolution, grid size, and duration.
4. Ignition points, burn-team paths, or fuel breaks are added from either user drawings or natural-language instructions.
5. The agent summarizes the configuration and waits for run confirmation unless the user explicitly asked to run immediately.
6. The agent runs the DEVS-FIRE simulation server-side.
7. The UI renders the returned cell operations as a fire-spread overlay.
8. The user can replay the spread, ask analysis questions, or request changed conditions for another run.

## Agent Tools

| Tool | Purpose |
| --- | --- |
| `create_simulation` | Opens a DEVS-FIRE session and stores the token server-side. |
| `configure_simulation` | Sets center location, wind speed/direction, cell resolution, grid dimension, and duration. |
| `set_point_ignition` | Places one or more ignition points by grid cell coordinate. |
| `set_burn_team` | Creates dynamic line ignition paths from segment coordinates. |
| `set_fuel_break` | Suppresses cells along a line to model a fuel break. |
| `run_simulation` | Runs or continues the simulation and returns cell operations plus burned-area/perimeter stats. |
| `get_terrain_data` | Reads fuel, slope, and aspect data for analysis. |

`run_simulation` returns the post-run statistics directly because several DEVS-FIRE result endpoints fail before a completed run. This keeps the agent from calling result tools too early.

## Tech Stack

| Layer | Technology |
| --- | --- |
| Framework | Next.js 16 App Router, React 19, TypeScript |
| Styling | Tailwind CSS 4, shadcn/ui-style components |
| AI runtime | Vercel AI SDK v6, `ToolLoopAgent` |
| Model provider | Google Vertex AI / Gemini |
| Map | react-map-gl, MapLibre GL JS, MapTiler styles |
| Drawing | Terra Draw |
| Simulation backend | Georgia State University DEVS-FIRE REST API |

## Project Structure

```text
app/
  page.tsx                         Main chat + map interface
  info/page.tsx                    Public project information page
  api/chat/route.ts                Streaming agent endpoint
  api/session/clear/route.ts       Clears the DEVS-FIRE session cookie
  api/simulation/cells/route.ts    Returns cached simulation cells for the UI

components/
  ai-elements/                     Chat, prompt, message, and tool UI components
  map/                             Map, overlays, grid controls, drawing tools, playback
  ui/                              Shared interface primitives

lib/
  agents/fire-agent.ts             ToolLoopAgent setup and request-scoped agent factory
  devs-fire/client.ts              Typed DEVS-FIRE HTTP client
  devs-fire/cell-cache.ts          Server-side cache for simulation cell operations
  devs-fire/types.ts               DEVS-FIRE response types
  draw/draw-context.tsx            Shared map, grid, drawing, and simulation state
  draw/grid-math.ts                Coordinate and grid conversion helpers
  prompts/system.ts                Agent system instructions
  tools/                           AI tool definitions mapped to DEVS-FIRE operations

scripts/
  test-api-client.ts               Manual API smoke-test helper
```

## Environment Setup

Requirements:

- Node.js 18 or newer
- pnpm
- Google Vertex AI API key
- MapTiler API key

Create `.env` in the project root:

```bash
GOOGLE_VERTEX_API_KEY=your_vertex_ai_api_key
NEXT_PUBLIC_MAPTILER_KEY=your_maptiler_api_key
DEVS_FIRE_BASE_URL=http://firesim.cs.gsu.edu:8084/api
```

`DEVS_FIRE_BASE_URL` defaults to the DEVS-FIRE API server used by the app. Override it only if the API is hosted or proxied somewhere else.

Install and run:

```bash
pnpm install
pnpm dev
```

Open http://localhost:3000.

## Verification

Useful checks before shipping changes:

```bash
pnpm typecheck
pnpm lint
pnpm build
```

The app depends on external services for a complete demo: Vertex AI for the agent, MapTiler for map tiles, and the DEVS-FIRE API for simulation execution.

## Demo Scenarios

Good demonstration prompts:

- `Wildfire in Angeles National Forest during Santa Ana winds`
- `Simulate a grass fire near Wichita, Kansas with strong south winds`
- `Fire at 34.3N 118.1W, ignition at all 4 corners, 2 hours`
- Draw a fuel break on the map, then ask Ember to use the drawn line as a fuel break before running.

These scenarios show both sides of the project: the agentic natural-language workflow and the manual FireMapSim-style controls.

## Notes

Ember is built on top of the Georgia State University DEVS-FIRE research API. The DEVS-FIRE API and fire-spread model are external research services; this repository contains the web UI, AI agent orchestration, map interaction layer, and API client integration.
