"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import MediaCard from "@/components/MediaCard";
import MediaGridSkeleton from "@/components/skeletons/MediaGridSkeleton";
import { UserActivity } from "@/types";
import { LayoutGrid, Clock, Bookmark, CheckCircle, Pause, Heart, Folder } from "lucide-react";

type FilterId = "all" | "watching" | "plan_to_watch" | "completed" | "paused" | "favorites";

interface FilterDef {
  id: FilterId;
  label: string;
  icon: typeof Clock;
  accent: string;
  match: (item: UserActivity) => boolean;
}

// A "watching" item is one actively in progress (past the halfway mark, or with no duration data yet).
const isActivelyWatching = (item: UserActivity) => {
  if (item.status !== "watching") return false;
  if (item.progress && item.progress.durationSeconds) {
    return item.progress.timestampSeconds >= item.progress.durationSeconds * 0.5;
  }
  return true;
};

const FILTERS: FilterDef[] = [
  { id: "all", label: "All", icon: LayoutGrid, accent: "var(--text-secondary)", match: () => true },
  { id: "watching", label: "Watching", icon: Clock, accent: "var(--status-watching)", match: isActivelyWatching },
  { id: "plan_to_watch", label: "Planning", icon: Bookmark, accent: "var(--status-planning)", match: (i) => i.status === "plan_to_watch" },
  { id: "completed", label: "Completed", icon: CheckCircle, accent: "var(--status-completed)", match: (i) => i.status === "completed" },
  { id: "paused", label: "Paused", icon: Pause, accent: "var(--status-paused)", match: (i) => i.status === "paused" },
  { id: "favorites", label: "Favorites", icon: Heart, accent: "var(--status-favorite)", match: (i) => Boolean(i.isFavorite) },
];

export default function WatchlistPage() {
  const [activities, setActivities] = useState<UserActivity[]>([]);
  const [filter, setFilter] = useState<FilterId>("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    fetch("/api/activities")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!active) return;
        if (data?.ok && data.data?.activities) {
          setActivities(data.data.activities);
        }
      })
      .catch((err) => console.error(err))
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  // Single-pass count computation for every status category — recomputed only when data changes.
  const counts = useMemo(() => {
    const acc: Record<FilterId, number> = {
      all: 0,
      watching: 0,
      plan_to_watch: 0,
      completed: 0,
      paused: 0,
      favorites: 0,
    };
    for (const item of activities) {
      for (const f of FILTERS) {
        if (f.match(item)) acc[f.id] += 1;
      }
    }
    return acc;
  }, [activities]);

  // Filtered list is memoized against the active filter + data set to avoid re-filtering on unrelated renders.
  const filteredItems = useMemo(() => {
    const active = FILTERS.find((f) => f.id === filter) ?? FILTERS[0];
    return activities.filter(active.match);
  }, [activities, filter]);

  const handleRemove = useCallback((mediaId: number | string) => {
    setActivities((prev) => prev.filter((a) => a.mediaId !== mediaId));
  }, []);

  return (
    <div style={{ maxWidth: 1440, margin: "0 auto", padding: "1.25rem 1rem 5rem 1rem" }}>
      {/* Terminal Header */}
      <div style={{ marginBottom: "1rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <h1 className="term-prefix" style={{ fontSize: "1.3rem", fontWeight: 700, letterSpacing: "-0.02em" }}>
            Watchlist
          </h1>
          <span className="badge-mono">USER_LIBRARY</span>
        </div>
        <p className="font-mono" style={{ color: "var(--text-muted)", fontSize: "0.74rem", marginTop: 4 }}>
          {activities.length} {activities.length === 1 ? "entry" : "entries"} tracked across all status channels
        </p>
      </div>

      {/* Status Category Summary — the richer retro status system */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(118px, 1fr))",
          gap: "0.5rem",
          marginBottom: "1.25rem",
        }}
      >
        {FILTERS.map((f) => {
          const Icon = f.icon;
          const activeFilter = filter === f.id;
          return (
            <button
              key={f.id}
              type="button"
              onClick={() => setFilter(f.id)}
              className="status-chip"
              data-active={activeFilter}
              aria-pressed={activeFilter}
              style={{ ["--chip-accent" as string]: f.accent, justifyContent: "space-between" }}
            >
              <span style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                <span className="chip-dot" aria-hidden />
                <span style={{ display: "flex", flexDirection: "column", gap: 3, minWidth: 0 }}>
                  <span className="chip-count">{counts[f.id]}</span>
                  <span
                    className="chip-label"
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 4,
                      color: activeFilter ? f.accent : "var(--text-muted)",
                    }}
                  >
                    <Icon size={9} />
                    {f.label}
                  </span>
                </span>
              </span>
            </button>
          );
        })}
      </div>

      {/* Grid */}
      {loading ? (
        <MediaGridSkeleton count={12} />
      ) : filteredItems.length > 0 ? (
        <div className="responsive-media-grid">
          {filteredItems.map((act) => (
            <MediaCard
              key={`${act.mediaType}-${act.mediaId}`}
              item={act}
              showProgress={act.status === "watching"}
              showRemove={true}
              onRemove={() => handleRemove(act.mediaId)}
            />
          ))}
        </div>
      ) : (
        <div
          className="panel"
          style={{
            padding: "3rem 1.5rem",
            textAlign: "center",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "0.5rem",
            background: "var(--bg-surface)",
          }}
        >
          <Folder size={28} color="var(--text-muted)" />
          <h3 className="font-mono" style={{ fontSize: "0.88rem" }}>LIBRARY_SEGMENT_EMPTY</h3>
          <p style={{ color: "var(--text-muted)", maxWidth: 340, fontSize: "0.78rem" }}>
            No titles found under this category filter. Browse the catalog to queue titles for future sessions.
          </p>
        </div>
      )}
    </div>
  );
}
