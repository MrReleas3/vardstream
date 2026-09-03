import type { Metadata } from "next";
import { Suspense } from "react";
import "./globals.css";
import RetroHeader from "@/components/RetroHeader";
import RetroBottomNav from "@/components/RetroBottomNav";
import { WatchlistProvider } from "@/context/WatchlistContext";

export const metadata: Metadata = {
  title: "VARD_stream // Media Database Terminal",
  description: "Next-generation aggregated streaming terminal with multi-provider waterfall routing and zero-latency media catalog.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className="crt-flicker"
        style={{
          backgroundColor: "var(--screen-bg)",
          color: "var(--phosphor)",
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <WatchlistProvider>
          <RetroHeader />
          <main style={{ flex: 1, display: "flex", flexDirection: "column" }}>{children}</main>
          <Suspense fallback={null}>
            <RetroBottomNav />
          </Suspense>
        </WatchlistProvider>
      </body>
    </html>
  );
}
