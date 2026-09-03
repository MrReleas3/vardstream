"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useWatchlist } from "@/context/WatchlistContext";

export default function RetroHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const { watchlistCount } = useWatchlist();

  const [timeStr, setTimeStr] = useState("");
  const [dateStr, setDateStr] = useState("");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const updateTime = () => {
      const now = new Date();
      setTimeStr(
        `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`
      );
      setDateStr(
        `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(
          now.getDate()
        ).padStart(2, "0")}`
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 30000);
    return () => clearInterval(interval);
  }, []);

  // Hide header on public auth pages
  const isAuthPage =
    pathname === "/welcome" ||
    pathname === "/login" ||
    pathname === "/register" ||
    pathname === "/forgot-password" ||
    pathname === "/reset-password";

  if (isAuthPage) {
    return null;
  }

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {}
    router.push("/welcome");
  };

  return (
    <header
      style={{
        borderBottom: "1px solid rgba(142, 207, 142, 0.14)",
        padding: "0 16px",
        height: 44,
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        background: "rgba(8, 13, 8, 0.96)",
        position: "sticky",
        top: 0,
        zIndex: 50,
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        flexShrink: 0,
        fontFamily: "'JetBrains Mono', 'Share Tech Mono', monospace",
      }}
    >
      {/* Brand */}
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <Link
          href="/"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            textDecoration: "none",
            color: "inherit",
          }}
        >
          <span style={{ fontSize: 9, color: "rgba(142, 207, 142, 0.35)", letterSpacing: "0.12em" }}>
            SYS:
          </span>
          <span
            style={{
              fontSize: 12,
              fontWeight: 700,
              color: "#8ecf8e",
              letterSpacing: "0.15em",
              textShadow: "0 0 10px rgba(142, 207, 142, 0.5)",
            }}
          >
            VARD_stream
          </span>
          <span style={{ fontSize: 9, color: "rgba(142, 207, 142, 0.3)", letterSpacing: "0.08em" }}>
            v2.4.1
          </span>
        </Link>
      </div>

      {/* Meta — Desktop */}
      <div
        className="header-meta"
        style={{
          display: "flex",
          gap: 14,
          alignItems: "center",
          fontSize: 9,
          color: "rgba(142, 207, 142, 0.38)",
          letterSpacing: "0.08em",
        }}
      >
        <span>{watchlistCount} QUEUED</span>
        <span style={{ color: "rgba(142, 207, 142, 0.15)" }}>|</span>
        <span>{mounted ? dateStr : "----/--/--"}</span>
        <span style={{ color: "rgba(142, 207, 142, 0.15)" }}>|</span>
        <span>{mounted ? timeStr : "--:--"}</span>
        <span style={{ color: "rgba(142, 207, 142, 0.15)" }}>|</span>
        <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <span
            style={{
              width: 6,
              height: 6,
              borderRadius: "50%",
              background: "#8ecf8e",
              display: "inline-block",
              boxShadow: "0 0 6px #8ecf8e",
            }}
          />
          ONLINE
        </span>
        <span style={{ color: "rgba(142, 207, 142, 0.15)" }}>|</span>
        <button
          onClick={handleLogout}
          style={{
            background: "transparent",
            border: "1px solid rgba(142, 207, 142, 0.2)",
            color: "rgba(142, 207, 142, 0.4)",
            fontSize: 9,
            padding: "2px 7px",
            cursor: "pointer",
            letterSpacing: "0.08em",
            fontFamily: "inherit",
            transition: "all 0.15s ease",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = "#fda4af";
            e.currentTarget.style.borderColor = "rgba(244, 63, 94, 0.4)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = "rgba(142, 207, 142, 0.4)";
            e.currentTarget.style.borderColor = "rgba(142, 207, 142, 0.2)";
          }}
        >
          [LOGOUT]
        </button>
      </div>

      {/* Compact Meta for Mobile */}
      <div
        className="header-meta-mobile"
        style={{
          display: "none",
          alignItems: "center",
          gap: 8,
        }}
      >
        <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 9, color: "rgba(142, 207, 142, 0.4)" }}>
          <span
            style={{
              width: 6,
              height: 6,
              borderRadius: "50%",
              background: "#8ecf8e",
              display: "inline-block",
              boxShadow: "0 0 6px #8ecf8e",
            }}
          />
          {watchlistCount > 0 && <span>{watchlistCount}Q</span>}
        </span>
        <button
          onClick={handleLogout}
          style={{
            background: "transparent",
            border: "none",
            color: "rgba(142, 207, 142, 0.35)",
            fontSize: 9,
            cursor: "pointer",
            letterSpacing: "0.08em",
            fontFamily: "inherit",
            padding: "2px 4px",
          }}
        >
          [X]
        </button>
      </div>

      <style jsx>{`
        @media (max-width: 600px) {
          .header-meta {
            display: none !important;
          }
          .header-meta-mobile {
            display: flex !important;
          }
        }
      `}</style>
    </header>
  );
}
