"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useWatchlist } from "@/context/WatchlistContext";

export default function RetroBottomNav() {
  const pathname = usePathname();
  const { watchlistCount } = useWatchlist();

  // Hide on public auth pages
  const isAuthPage =
    pathname === "/welcome" ||
    pathname === "/login" ||
    pathname === "/register" ||
    pathname === "/forgot-password" ||
    pathname === "/reset-password";

  if (isAuthPage) {
    return null;
  }

  const isWatchlist = pathname.startsWith("/watchlist");
  const isSearch = !isWatchlist; // default active tab when on search, home, or details

  return (
    <div
      className="nav-pill-wrap"
      style={{
        position: "fixed",
        bottom: 24,
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 1000,
        fontFamily: "'JetBrains Mono', 'Share Tech Mono', monospace",
        pointerEvents: "auto",
      }}
    >
      <nav
        className="nav-pill"
        style={{
          display: "flex",
          gap: 4,
          padding: "5px",
          borderRadius: 100,
        }}
      >
        {/* Search Tab */}
        <Link
          href="/"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 7,
            padding: "10px 20px",
            borderRadius: 100,
            textDecoration: "none",
            background: isSearch ? "rgba(142, 207, 142, 0.15)" : "transparent",
            color: isSearch ? "#8ecf8e" : "rgba(142, 207, 142, 0.4)",
            fontSize: 11,
            fontWeight: isSearch ? 700 : 400,
            letterSpacing: "0.14em",
            cursor: "pointer",
            transition: "all 0.18s ease",
            textShadow: isSearch ? "0 0 10px rgba(142, 207, 142, 0.7)" : "none",
            whiteSpace: "nowrap",
            WebkitTapHighlightColor: "transparent",
          }}
        >
          <span style={{ fontSize: 11, opacity: isSearch ? 1 : 0.6 }}>&gt;_</span>
          <span>SEARCH</span>
        </Link>

        {/* Watchlist Tab */}
        <Link
          href="/watchlist"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 7,
            padding: "10px 20px",
            borderRadius: 100,
            textDecoration: "none",
            background: isWatchlist ? "rgba(142, 207, 142, 0.15)" : "transparent",
            color: isWatchlist ? "#8ecf8e" : "rgba(142, 207, 142, 0.4)",
            fontSize: 11,
            fontWeight: isWatchlist ? 700 : 400,
            letterSpacing: "0.14em",
            cursor: "pointer",
            transition: "all 0.18s ease",
            textShadow: isWatchlist ? "0 0 10px rgba(142, 207, 142, 0.7)" : "none",
            whiteSpace: "nowrap",
            WebkitTapHighlightColor: "transparent",
          }}
        >
          <span style={{ fontSize: 11, opacity: isWatchlist ? 1 : 0.6 }}>▶</span>
          <span>WATCHLIST</span>
          {watchlistCount > 0 && (
            <span
              style={{
                background: "rgba(142, 207, 142, 0.2)",
                border: "1px solid rgba(142, 207, 142, 0.4)",
                color: "#8ecf8e",
                fontSize: 9,
                fontWeight: 700,
                padding: "1px 6px",
                borderRadius: 100,
                letterSpacing: "0.05em",
                textShadow: "0 0 6px rgba(142, 207, 142, 0.6)",
              }}
            >
              {watchlistCount}
            </span>
          )}
        </Link>
      </nav>

      <style jsx>{`
        @media (max-width: 480px) {
          .nav-pill-wrap {
            bottom: 16px !important;
          }
        }
      `}</style>
    </div>
  );
}
