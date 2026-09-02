import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-sans",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-mono",
});

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
    <html lang="en" className={`dark ${inter.variable} ${jetbrainsMono.variable}`}>
      <body style={{ backgroundColor: "var(--bg-canvas)", color: "var(--text-primary)", minHeight: "100vh" }}>
        <Navbar />
        <main style={{ minHeight: "calc(100vh - 56px)" }}>{children}</main>
      </body>
    </html>
  );
}
