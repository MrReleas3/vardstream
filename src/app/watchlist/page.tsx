"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import MediaCard from "@/components/MediaCard";
import { useWatchlist } from "@/context/WatchlistContext";

type WatchlistFilter = "all" | "watching" | "plan_to_watch" | "completed" | "favorites";

export default function WatchlistPage() {
  const { activities, loading } = useWatchlist();
  const [filter, setFilter] = useState<WatchlistFilter>("all");

  const counts = useMemo(() => {
    let watching = 0;
    let plan = 0;
    let completed = 0;
    let favorites = 0;

    for (const a of activities) {
      if (a.status === "watching") watching++;
      else if (a.status === "plan_to_watch") plan++;
      else if (a.status === "completed") completed++;
      if (a.isFavorite) favorites++;
    }

    return {
      all: activities.length,
      watching,
      plan_to_watch: plan,
      completed,
      favorites,
    };
  }, [activities]);

  const filteredItems = useMemo(() => {
    if (filter === "all") return activities;
    if (filter === "watching") return activities.filter((a) => a.status === "watching");
    if (filter === "plan_to_watch") return activities.filter((a) => a.status === "plan_to_watch");
    if (filter === "completed") return activities.filter((a) => a.status === "completed");
    if (filter === "favorites") return activities.filter((a) => a.isFavorite);
    return activities;
  }, [activities, filter]);

  return (
    <div
      className="page-pad"
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: "32px 20px 100px",
        fontFamily: "'JetBrains Mono', 'Share Tech Mono', monospace",
      }}
    >
      <div style={{ width: "100%", maxWidth: 1100 }}>
        {/* Header Hero */}
        <div style={{ marginBottom: 24, textAlign: "center" }}>
          <div
            className="hero-eyebrow"
            style={{
              fontSize: 10,
              letterSpacing: "0.28em",
              color: "rgba(142,207,142,0.38)",
              marginBottom: 8,
            }}
          >
            ══ PERSONAL QUEUE ══
          </div>
          <h1
            className="glow-text hero-title"
            style={{
              fontSize: 28,
              fontWeight: 700,
              letterSpacing: "0.1em",
              color: "#8ecf8e",
            }}
          >
            WATCHLIST
          </h1>
        </div>

        {/* Status Lists / Segment Filter Bar */}
        <div
          style={{
            display: "flex",
            gap: 4,
            marginBottom: 20,
            overflowX: "auto",
            paddingBottom: 4,
            justifyContent: "center",
            flexWrap: "wrap",
          }}
        >
          {(
            [
              { id: "all", label: "ALL", count: counts.all },
              { id: "watching", label: "WATCHING", count: counts.watching },
              { id: "plan_to_watch", label: "PLAN_TO_WATCH", count: counts.plan_to_watch },
              { id: "completed", label: "COMPLETED", count: counts.completed },
              { id: "favorites", label: "FAVORITES", count: counts.favorites },
            ] as const
          ).map(({ id, label, count }) => {
            const isActive = filter === id;
            return (
              <button
                key={id}
                onClick={() => setFilter(id)}
                style={{
                  background: isActive ? "rgba(142,207,142,0.14)" : "transparent",
                  border: `1px solid ${isActive ? "rgba(142,207,142,0.5)" : "rgba(142,207,142,0.15)"}`,
                  color: isActive ? "#8ecf8e" : "rgba(142,207,142,0.4)",
                  fontFamily: "inherit",
                  fontSize: 10,
                  letterSpacing: "0.1em",
                  padding: "6px 14px",
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                  fontWeight: isActive ? 700 : 400,
                  textShadow: isActive ? "0 0 8px rgba(142,207,142,0.5)" : "none",
                  whiteSpace: "nowrap",
                }}
              >
                {label} [{count}]
              </button>
            );
          })}
        </div>

        {/* Section Header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            paddingBottom: 8,
            borderBottom: "1px solid rgba(142,207,142,0.1)",
            marginBottom: 14,
          }}
        >
          <span
            className="section-header"
            style={{
              fontSize: 10,
              fontWeight: 600,
              letterSpacing: "0.15em",
              color: "rgba(142,207,142,0.6)",
            }}
          >
            QUEUED TITLES
          </span>
          <span style={{ fontSize: 9, color: "rgba(142,207,142,0.3)", letterSpacing: "0.08em" }}>
            {filteredItems.length} ITEM{filteredItems.length !== 1 ? "S" : ""}
          </span>
        </div>

        {/* Content: Populated Grid or Empty State */}
        {loading ? (
          <div style={{ textAlign: "center", padding: "64px 0", color: "rgba(142,207,142,0.4)" }}>
            <div style={{ fontSize: 11, letterSpacing: "0.2em" }}>LOADING PERSONAL QUEUE...</div>
          </div>
        ) : filteredItems.length > 0 ? (
          <div
            className="results-grid"
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
              gap: 10,
            }}
          >
            {filteredItems.map((item) => (
              <MediaCard
                key={`${item.mediaType}-${item.mediaId}`}
                item={{
                  ...item,
                  tmdbId: item.mediaId,
                  title: item.title,
                }}
              />
            ))}
          </div>
        ) : (
          <div style={{ textAlign: "center", padding: "64px 0", color: "rgba(142,207,142,0.25)" }}>
            <div style={{ fontSize: 36, marginBottom: 12, letterSpacing: "0.05em" }}>[ EMPTY ]</div>
            <div style={{ fontSize: 11, letterSpacing: "0.2em", marginBottom: 5 }}>
              {filter === "all" ? "QUEUE IS EMPTY" : `NO TITLES IN ${filter.toUpperCase()} LIST`}
            </div>
            <div
              style={{
                fontSize: 10,
                color: "rgba(142,207,142,0.15)",
                letterSpacing: "0.08em",
                marginBottom: 20,
              }}
            >
              USE SEARCH TO FIND AND QUEUE TITLES
            </div>
            <Link
              href="/"
              style={{
                display: "inline-block",
                background: "transparent",
                border: "1px solid rgba(142,207,142,0.3)",
                color: "rgba(142,207,142,0.6)",
                fontFamily: "inherit",
                fontSize: 11,
                letterSpacing: "0.15em",
                padding: "10px 24px",
                textDecoration: "none",
                cursor: "pointer",
                transition: "all 0.15s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = "rgba(142,207,142,0.7)";
                e.currentTarget.style.color = "#8ecf8e";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "rgba(142,207,142,0.3)";
                e.currentTarget.style.color = "rgba(142,207,142,0.6)";
              }}
            >
              BROWSE TITLES
            </Link>
          </div>
        )}
      </div>

      <style jsx>{`
        @media (max-width: 480px) {
          .hero-title {
            font-size: 22px !important;
          }
          .hero-eyebrow {
            font-size: 9px !important;
          }
          .page-pad {
            padding-left: 14px !important;
            padding-right: 14px !important;
            padding-top: 24px !important;
          }
          .results-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}
