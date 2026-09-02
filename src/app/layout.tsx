import type { Metadata } from "next";
import "./globals.css";
import Navbar from "@/components/Navbar";

export const metadata: Metadata = {
  title: "VardStream // Private Streaming Platform",
  description: "Next-generation aggregated streaming portal with multi-provider waterfall routing, canary telemetry, and zero-latency catalog.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body style={{ backgroundColor: "var(--bg-canvas)", color: "var(--text-primary)", minHeight: "100vh" }}>
        <Navbar />
        <main style={{ minHeight: "calc(100vh - 56px)" }}>{children}</main>
      </body>
    </html>
  );
}
