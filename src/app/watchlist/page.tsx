"use client";

import React, { useState, useEffect } from "react";
import MediaCard from "@/components/MediaCard";
import { UserActivity } from "@/types";
import { Bookmark, Clock, CheckCircle, Heart, Folder } from "lucide-react";

export default function WatchlistPage() {
  const [activities, setActivities] = useState<UserActivity[]>([]);
  const [filter, setFilter] = useState<string>("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/activities")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.ok && data.data?.activities) {
          setActivities(data.data.activities);
        }
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  const filteredItems = activities.filter((item) => {
    if (filter === "watching") {
      if (item.status !== "watching") return false;
      if (item.progress && item.progress.durationSeconds) {
        return item.progress.timestampSeconds >= item.progress.durationSeconds * 0.5;
      }
      return true;
    }
    if (filter === "plan_to_watch") return item.status === "plan_to_watch";
    if (filter === "completed") return item.status === "completed";
    if (filter === "favorites") return item.isFavorite;
    return true;
  });

  return (
    <div style={{ maxWidth: 1440, margin: "0 auto", padding: "1.25rem 1rem 5rem 1rem" }}>
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "space-between",
          marginBottom: "1.25rem",
          paddingBottom: "0.75rem",
          borderBottom: "1px solid var(--border-default)",
          flexWrap: "wrap",
          gap: "0.75rem",
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <h1 style={{ fontSize: "1.25rem", fontWeight: 700, letterSpacing: "-0.02em" }}>My Watchlist</h1>
            <span className="badge-mono">USER_WATCHLIST</span>
          </div>
          <p style={{ color: "var(--text-muted)", fontSize: "0.78rem", marginTop: 2 }}>
            Saved catalog items, personal bookmarks, and watch history
          </p>
        </div>

        {/* Filter Tabs */}
        <div
          style={{
            display: "flex",
            background: "var(--bg-surface)",
            border: "1px solid var(--border-default)",
            borderRadius: "var(--radius-xs)",
            padding: "2px",
            overflowX: "auto",
            maxWidth: "100%",
          }}
        >
          <button
            onClick={() => setFilter("all")}
            className="btn btn-ghost"
            style={{
              padding: "3px 8px",
              fontSize: "0.75rem",
              fontFamily: "var(--font-mono)",
              background: filter === "all" ? "var(--bg-surface-elevated)" : "transparent",
              color: filter === "all" ? "var(--text-primary)" : "var(--text-secondary)",
              border: filter === "all" ? "1px solid var(--border-default)" : "1px solid transparent",
            }}
          >
            ALL ({activities.length})
          </button>
          <button
            onClick={() => setFilter("watching")}
            className="btn btn-ghost"
            style={{
              padding: "3px 8px",
              fontSize: "0.75rem",
              fontFamily: "var(--font-mono)",
              background: filter === "watching" ? "var(--bg-surface-elevated)" : "transparent",
              color: filter === "watching" ? "var(--text-primary)" : "var(--text-secondary)",
              border: filter === "watching" ? "1px solid var(--border-default)" : "1px solid transparent",
              display: "flex",
              alignItems: "center",
              gap: 4,
            }}
          >
            <Clock size={11} /> WATCHING
          </button>
          <button
            onClick={() => setFilter("plan_to_watch")}
            className="btn btn-ghost"
            style={{
              padding: "3px 8px",
              fontSize: "0.75rem",
              fontFamily: "var(--font-mono)",
              background: filter === "plan_to_watch" ? "var(--bg-surface-elevated)" : "transparent",
              color: filter === "plan_to_watch" ? "var(--text-primary)" : "var(--text-secondary)",
              border: filter === "plan_to_watch" ? "1px solid var(--border-default)" : "1px solid transparent",
              display: "flex",
              alignItems: "center",
              gap: 4,
            }}
          >
            <Bookmark size={11} /> PLAN_TO_WATCH
          </button>
          <button
            onClick={() => setFilter("completed")}
            className="btn btn-ghost"
            style={{
              padding: "3px 8px",
              fontSize: "0.75rem",
              fontFamily: "var(--font-mono)",
              background: filter === "completed" ? "var(--bg-surface-elevated)" : "transparent",
              color: filter === "completed" ? "var(--text-primary)" : "var(--text-secondary)",
              border: filter === "completed" ? "1px solid var(--border-default)" : "1px solid transparent",
              display: "flex",
              alignItems: "center",
              gap: 4,
            }}
          >
            <CheckCircle size={11} /> DONE
          </button>
          <button
            onClick={() => setFilter("favorites")}
            className="btn btn-ghost"
            style={{
              padding: "3px 8px",
              fontSize: "0.75rem",
              fontFamily: "var(--font-mono)",
              background: filter === "favorites" ? "var(--bg-surface-elevated)" : "transparent",
              color: filter === "favorites" ? "var(--text-primary)" : "var(--text-secondary)",
              border: filter === "favorites" ? "1px solid var(--border-default)" : "1px solid transparent",
              display: "flex",
              alignItems: "center",
              gap: 4,
            }}
          >
            <Heart size={11} /> FAVS
          </button>
        </div>
      </div>

      {/* Grid */}
      {loading ? (
        <div style={{ textAlign: "center", padding: "3rem" }}>
          <div
            style={{
              width: 18,
              height: 18,
              border: "2px solid var(--border-default)",
              borderTopColor: "var(--text-primary)",
              borderRadius: "50%",
              animation: "spin 0.6s linear infinite",
              margin: "0 auto 0.5rem auto",
            }}
          />
          <p className="font-mono" style={{ color: "var(--text-muted)", fontSize: "0.75rem" }}>
            SYNCHRONIZING_USER_LIBRARY...
          </p>
        </div>
      ) : filteredItems.length > 0 ? (
        <div className="responsive-media-grid">
          {filteredItems.map((act) => (
            <MediaCard
              key={`${act.mediaType}-${act.mediaId}`}
              item={act}
              showProgress={act.status === "watching"}
              showRemove={true}
              onRemove={() => setActivities((prev) => prev.filter((a) => a.mediaId !== act.mediaId))}
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
            No titles found under this category filter. Browse titles to queue them for future sessions.
          </p>
        </div>
      )}
    </div>
  );
}
