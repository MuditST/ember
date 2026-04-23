import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";

import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { cn } from "@/lib/utils";

const geist = Geist({ subsets: ["latin"], variable: "--font-sans" });

const fontMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
});

export const metadata: Metadata = {
  title: {
    default: "Ember — Agentic Wildfire Simulation",
    template: "%s | Ember",
  },
  description:
    "Translate natural language into real-time wildfire simulations. Chat-driven interface powered by DEVS-FIRE and Gemini.",
  keywords: [
    "wildfire simulation",
    "DEVS-FIRE",
    "fire spread",
    "AI agent",
    "Gemini",
    "Vertex AI",
    "MapLibre",
  ],
  authors: [{ name: "Ember" }],
  openGraph: {
    title: "Ember — Agentic Wildfire Simulation",
    description:
      "Simulate a wildfire in natural language and watch it burn in real-time.",
    siteName: "Ember",
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "Ember — Agentic Wildfire Simulation",
    description:
      "Chat-driven wildfire simulation interface powered by DEVS-FIRE and Gemini.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" },
  ],
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={cn(
        "antialiased",
        fontMono.variable,
        "font-sans",
        geist.variable
      )}
    >
      <body>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
