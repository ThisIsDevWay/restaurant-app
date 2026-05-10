import type { ReactNode } from "react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Smart TV - Restaurante G y M",
  robots: { index: false, follow: false },
  manifest: "/tv-manifest.webmanifest",
};

/**
 * Layout for the public Smart TV display.
 * - No QueryProvider, no Sidebar, no header chrome.
 * - Black fullscreen background.
 * - Service worker is intentionally NOT used here so content stays fresh.
 */
export default function TvLayout({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        margin: 0,
        padding: 0,
        width: "100vw",
        height: "100vh",
        background: "#000",
        color: "#fff",
        overflow: "hidden",
        fontFamily:
          'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
      }}
    >
      {children}
    </div>
  );
}
