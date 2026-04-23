import Link from "next/link";
import Image from "next/image";
import {
  ArrowLeft,
  Wind,
  MapPin,
  Play,
  MousePointerClick,
  MessageSquare,
  Layers,
} from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";

export const metadata = {
  title: "Ember — Info",
  description:
    "Learn about Ember, an agentic wildfire simulation interface powered by DEVS-FIRE.",
};

const TOOLS = [
  {
    name: "create_simulation",
    desc: "Connects to the DEVS-FIRE server and gets a session token",
  },
  {
    name: "configure_simulation",
    desc: "Sets location, wind conditions, grid resolution, and duration",
  },
  {
    name: "set_point_ignition",
    desc: "Places one or more ignition points on the grid",
  },
  {
    name: "set_burn_team",
    desc: "Configures dynamic ignition paths (line ignition)",
  },
  {
    name: "set_fuel_break",
    desc: "Suppresses cells to create firebreaks",
  },
  {
    name: "run_simulation",
    desc: "Executes the simulation and returns burned area, perimeter, and raw cell data",
  },
  {
    name: "get_terrain_data",
    desc: "Reads fuel type, slope, and aspect for any cell range",
  },
];

const STACK = [
  { label: "Framework", value: "Next.js 16 (App Router, Turbopack)" },
  { label: "Styling", value: "Tailwind CSS 4 + shadcn/ui" },
  { label: "Chat UI", value: "AI Elements" },
  { label: "AI", value: "Vercel AI SDK v6 + Vertex AI (Gemini 3 Flash)" },
  { label: "Agent", value: "ToolLoopAgent with InferAgentUIMessage" },
  { label: "Map", value: "react-map-gl + MapLibre GL JS + MapTiler" },
  { label: "Drawing", value: "Terra Draw (points, polylines)" },
  { label: "Simulation", value: "DEVS-FIRE REST API (GSU ACME Lab)" },
];

const FEATURES = [
  {
    icon: MessageSquare,
    title: "Chat-Driven Setup",
    desc: "Describe a fire scenario in plain English. The agent configures everything.",
  },
  {
    icon: MapPin,
    title: "Interactive Map",
    desc: "Real-time fire spread visualization with heatmap overlays and satellite imagery.",
  },
  {
    icon: MousePointerClick,
    title: "Draw to Configure",
    desc: "Click to place ignition points, draw polylines for burn teams and fuel breaks.",
  },
  {
    icon: Wind,
    title: "Wind & Terrain",
    desc: "Configure wind speed, direction, and analyze fuel types using LANDFIRE data.",
  },
  {
    icon: Play,
    title: "Playback Controls",
    desc: "Scrub through the fire spread timeline with play/pause, speed control, and seek.",
  },
  {
    icon: Layers,
    title: "Confirm Before Run",
    desc: "The agent summarizes all parameters and waits for explicit confirmation.",
  },
];

const PIPELINE_STEPS = [
  { step: "1", text: 'User: "Simulate a fire near Atlanta, GA"' },
  { step: "2", text: "Ember → create_simulation() → session token" },
  { step: "3", text: "Ember → configure_simulation() → location, wind, grid" },
  { step: "4", text: 'Ember → "Where should the ignition be?"' },
  { step: "5", text: "User clicks map or types coordinates" },
  { step: "6", text: "Ember → set_point_ignition() → fire start placed" },
  { step: "7", text: 'Ember → summary → "Ready to run?"' },
  { step: "8", text: 'User: "Yes, run it"' },
  { step: "9", text: "Ember → run_simulation(3600s) → cells + stats" },
  { step: "10", text: "Map renders heatmap, playback bar appears" },
];

export default function InfoPage() {
  return (
    <div className="relative min-h-svh bg-background text-foreground">
      {/* ── Fixed nav ── */}
      <div className="fixed top-6 left-6 z-50">
        <Link
          href="/"
          className="group flex items-center gap-2 rounded-xl border bg-background/80 px-3.5 py-2 text-[13px] font-medium text-muted-foreground shadow-lg backdrop-blur-sm transition-colors hover:bg-muted hover:text-foreground"
        >
          <ArrowLeft className="size-3.5 transition-transform group-hover:-translate-x-0.5" />
          Back to Ember
        </Link>
      </div>
      <div className="fixed top-6 right-6 z-50">
        <ThemeToggle />
      </div>

      {/* ── Hero ── */}
      <section className="flex flex-col items-center justify-center px-6 pt-28 pb-20">
        <div className="flex items-center gap-3 mb-4">
          <Image
            src="/ember-logo.png"
            alt="Ember"
            width={40}
            height={40}
            className="rounded-lg"
          />
          <h1 className="text-4xl font-semibold tracking-tight">Ember</h1>
        </div>
        <p className="max-w-lg text-center text-lg font-light text-muted-foreground leading-relaxed">
          An agentic wildfire simulation interface — translate natural language
          into real-time fire simulations powered by{" "}
          <a
            href="https://firesim.cs.gsu.edu/api/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary underline underline-offset-4 decoration-primary/30 hover:decoration-primary/60 transition-colors"
          >
            DEVS-FIRE
          </a>
          .
        </p>
      </section>

      {/* ── Features grid ── */}
      <section className="mx-auto max-w-4xl px-6 pb-20">
        <h2 className="mb-8 text-xs font-medium uppercase tracking-widest text-muted-foreground/60">
          Capabilities
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className="rounded-xl border bg-card/50 p-5 transition-colors hover:bg-card"
            >
              <f.icon className="mb-3 size-5 text-primary/70" />
              <h3 className="mb-1 text-[14px] font-medium">{f.title}</h3>
              <p className="text-[13px] font-light leading-relaxed text-muted-foreground">
                {f.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Pipeline ── */}
      <section className="mx-auto max-w-4xl px-6 pb-20">
        <h2 className="mb-8 text-xs font-medium uppercase tracking-widest text-muted-foreground/60">
          How It Works
        </h2>
        <div className="relative space-y-0">
          {PIPELINE_STEPS.map((s, i) => (
            <div key={s.step} className="flex items-start gap-4 pb-4">
              {/* Vertical timeline line */}
              <div className="relative flex flex-col items-center">
                <div className="flex size-7 shrink-0 items-center justify-center rounded-full border bg-muted text-[11px] font-mono font-medium text-muted-foreground">
                  {s.step}
                </div>
                {i < PIPELINE_STEPS.length - 1 && (
                  <div className="mt-1 h-full w-px bg-border" />
                )}
              </div>
              <p className="pt-1 text-[13px] font-light leading-relaxed text-foreground/80">
                {s.text}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Agent Tools ── */}
      <section className="mx-auto max-w-4xl px-6 pb-20">
        <h2 className="mb-8 text-xs font-medium uppercase tracking-widest text-muted-foreground/60">
          Agent Tools
        </h2>
        <div className="overflow-hidden rounded-xl border">
          {TOOLS.map((t, i) => (
            <div
              key={t.name}
              className={`flex items-baseline gap-4 px-5 py-3.5 ${
                i < TOOLS.length - 1 ? "border-b" : ""
              }`}
            >
              <code className="shrink-0 rounded-md bg-muted px-2 py-0.5 text-[12px] font-mono text-primary">
                {t.name}
              </code>
              <span className="text-[13px] font-light text-muted-foreground">
                {t.desc}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* ── Tech Stack ── */}
      <section className="mx-auto max-w-4xl px-6 pb-20">
        <h2 className="mb-8 text-xs font-medium uppercase tracking-widest text-muted-foreground/60">
          Tech Stack
        </h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {STACK.map((s) => (
            <div
              key={s.label}
              className="rounded-xl border bg-card/50 px-5 py-4"
            >
              <div className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground/50">
                {s.label}
              </div>
              <div className="mt-1 text-[13px] font-light text-foreground/80">
                {s.value}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Architecture ── */}
      <section className="mx-auto max-w-4xl px-6 pb-20">
        <h2 className="mb-8 text-xs font-medium uppercase tracking-widest text-muted-foreground/60">
          Architecture
        </h2>
        <div className="rounded-xl border bg-muted/30 p-6">
          <pre className="overflow-x-auto text-[12px] font-mono leading-relaxed text-muted-foreground">
{`User Message
    ↓
Gemini 3 Flash (ToolLoopAgent)
    ↓
Tool Calls (7 tools)
    ↓
DEVS-FIRE REST API
    ↓
Streamed Results → Map + Chat`}
          </pre>
        </div>
      </section>
    </div>
  );
}
