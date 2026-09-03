"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Star, Play, X, RefreshCw } from "lucide-react";
import { MediaDetail, MediaType, UserActivity } from "@/types";
import ConfirmModal from "./ConfirmModal";

interface MediaCardProps {
  item: MediaDetail | UserActivity;
  showProgress?: boolean;
  showRemove?: boolean;
  onRemove?: () => void;
  onCardClick?: (item: any) => void;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; border: string }> = {
  watching: {
    label: "WATCHING",
    color: "var(--status-watching)",
    bg: "var(--status-watching-bg)",
    border: "var(--status-watching-border)",
  },
  completed: {
    label: "COMPLETED",
    color: "var(--status-completed)",
    bg: "var(--status-completed-bg)",
    border: "var(--status-completed-border)",
  },
  plan_to_watch: {
    label: "PLANNING",
    color: "var(--status-planning)",
    bg: "var(--status-planning-bg)",
    border: "var(--status-planning-border)",
  },
  paused: {
    label: "PAUSED",
    color: "var(--status-paused)",
    bg: "var(--status-paused-bg)",
    border: "var(--status-paused-border)",
  },
  dropped: {
    label: "DROPPED",
    color: "#f87171",
    bg: "rgba(127, 29, 29, 0.55)",
    border: "rgba(248, 113, 113, 0.4)",
  },
};

function MediaCard({
  item,
  showProgress = false,
  showRemove = false,
  onRemove,
  onCardClick,
}: MediaCardProps) {
  const [removing, setRemoving] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const isActivity = "progress" in item || "status" in item;
  const tmdbId = isActivity
    ? (item as UserActivity).mediaId || (item as any).tmdbId || (item as any).id
    : (item as MediaDetail).tmdbId || (item as any).id || (item as any).mediaId;
  const mediaType: MediaType = isActivity
    ? (item as UserActivity).mediaType || "movie"
    : (item as MediaDetail).mediaType || (item as any).type || "movie";
  const title = (item as any).title || "Untitled";
  const posterPath = (item as any).posterPath;
  const backdropPath = (item as any).backdropPath;
  const voteAverage = (item as MediaDetail).voteAverage;
  const progress = (item as UserActivity).progress;
  const initialStatus = (item as any).status || null;
  const initialFavorite = isActivity ? (item as UserActivity).isFavorite : false;
  const badgeText = (item as any).badgeText;
  const episodeCount = (item as any).episodeCount;
  const targetUrl = (item as any).href || (tmdbId ? `/${mediaType}/${tmdbId}` : `/${mediaType}`);

  const statusConfig = initialStatus && STATUS_CONFIG[initialStatus] ? STATUS_CONFIG[initialStatus] : null;

  const executeQuickRemove = async () => {
    setRemoving(true);

    try {
      const res = await fetch(`/api/activities/${mediaType}/${tmdbId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        onRemove?.();
      }
    } catch (err) {
      console.error(err);
    }
    setRemoving(false);
    setShowConfirm(false);
  };

  const percentProgress =
    progress?.durationSeconds && progress?.timestampSeconds
      ? Math.min(100, Math.round((progress.timestampSeconds / progress.durationSeconds) * 100))
      : progress?.timestampSeconds
      ? 55
      : 0;

  const releaseYear =
    (item as MediaDetail).releaseDate?.substring(0, 4) ||
    (item as MediaDetail).firstAirDate?.substring(0, 4) ||
    "";

  return (
    <>
      <Link
        href={targetUrl}
        className="media-card-container"
        onClick={(e) => {
          if (onCardClick) {
            e.preventDefault();
            onCardClick(item);
          }
        }}
      >
        {/* Poster Aspect 2:3 */}
        <div
          style={{
            width: "100%",
            aspectRatio: "2/3",
            background: "var(--bg-subtle)",
            position: "relative",
            overflow: "hidden",
            borderBottom: "1px solid var(--border-subtle)",
          }}
        >
          {posterPath ? (
            <img
              src={posterPath}
              alt={title}
              loading="lazy"
              decoding="async"
              style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
            />
          ) : (
            <div
              style={{
                width: "100%",
                height: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "var(--text-muted)",
                fontSize: "0.72rem",
                padding: "0.5rem",
                textAlign: "center",
                fontFamily: "var(--font-mono)",
              }}
            >
              [NO_POSTER]
            </div>
          )}

          {/* Top Badges */}
          <div
            style={{
              position: "absolute",
              top: 4,
              left: 4,
              right: (showRemove || showProgress || isActivity) ? 26 : 4,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 3,
              pointerEvents: "none",
            }}
          >
            <span
              className="badge-mono"
              style={{
                fontSize: "0.58rem",
                padding: "1px 4px",
                background: "rgba(9, 9, 11, 0.9)",
                flexShrink: 0,
              }}
            >
              {badgeText || (mediaType === "tv" ? "TV" : "MOV")}
            </span>

            {voteAverage !== undefined && voteAverage > 0 && (
              <span
                className="badge-mono"
                style={{
                  fontSize: "0.58rem",
                  padding: "1px 4px",
                  background: "rgba(9, 9, 11, 0.9)",
                  color: "#fde68a",
                  borderColor: "rgba(245, 158, 11, 0.3)",
                  flexShrink: 0,
                }}
              >
                <Star size={8} fill="#fde68a" />
                {voteAverage.toFixed(1)}
              </span>
            )}
          </div>

          {/* One-Click Quick Dismiss Button with Confirmation Modal Trigger */}
          {(showRemove || showProgress || isActivity) && (
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setShowConfirm(true);
              }}
              disabled={removing}
              title="Remove from List"
              style={{
                position: "absolute",
                top: 4,
                right: 4,
                width: 20,
                height: 20,
                borderRadius: "var(--radius-xs)",
                background: "rgba(9, 9, 11, 0.85)",
                border: "1px solid var(--border-default)",
                color: "var(--text-muted)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                zIndex: 12,
                transition: "all 0.15s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = "var(--accent-rose)";
                e.currentTarget.style.borderColor = "rgba(244, 63, 94, 0.4)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = "var(--text-muted)";
                e.currentTarget.style.borderColor = "var(--border-default)";
              }}
            >
              {removing ? <RefreshCw size={9} className="animate-spin" /> : <X size={10} />}
            </button>
          )}

          {/* Play Icon Subtle Overlay */}
          <div className="play-hover-overlay">
            <div
              style={{
                width: 30,
                height: 30,
                borderRadius: "var(--radius-xs)",
                background: "#ffffff",
                color: "#000000",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Play size={13} fill="#000" color="#000" style={{ marginLeft: 2 }} />
            </div>
          </div>

          {/* Continue Watching Progress Line */}
          {showProgress && percentProgress > 0 && (
            <div
              style={{
                position: "absolute",
                bottom: 0,
                left: 0,
                width: "100%",
                height: 2,
                background: "rgba(255,255,255,0.15)",
              }}
            >
              <div
                style={{
                  height: "100%",
                  width: `${percentProgress}%`,
                  background: "var(--accent-emerald)",
                }}
              />
            </div>
          )}
        </div>

        {/* Info Block */}
        <div style={{ padding: "6px 8px", display: "flex", flexDirection: "column", gap: 3 }}>
          <h4
            style={{
              fontSize: "0.78rem",
              fontWeight: 600,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
              color: "var(--text-primary)",
            }}
            title={title}
          >
            {title}
          </h4>
          <div
            className="font-mono"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              fontSize: "0.68rem",
              color: "var(--text-muted)",
              gap: 4,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 5, minWidth: 0, overflow: "hidden" }}>
              {statusConfig && (
                <span
                  className="badge-mono"
                  style={{
                    fontSize: "0.56rem",
                    padding: "0px 4px",
                    background: statusConfig.bg,
                    color: statusConfig.color,
                    borderColor: statusConfig.border,
                    fontWeight: 700,
                    letterSpacing: "0.02em",
                    lineHeight: "1.35",
                    flexShrink: 0,
                  }}
                >
                  {statusConfig.label}
                </span>
              )}

              {episodeCount ? (
                <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {episodeCount} EPS {releaseYear ? `// ${releaseYear}` : ""}
                </span>
              ) : mediaType === "tv" && progress?.lastSeason ? (
                <span style={{ color: "var(--accent-brand)", whiteSpace: "nowrap" }}>
                  S{progress.lastSeason}:E{progress.lastEpisode || 1}
                </span>
              ) : (
                <span style={{ whiteSpace: "nowrap" }}>{releaseYear || "—"}</span>
              )}
            </div>

            {showProgress && percentProgress > 0 ? (
              <span style={{ color: "var(--accent-emerald)", flexShrink: 0, fontWeight: 600 }}>{percentProgress}%</span>
            ) : initialFavorite ? (
              <span style={{ color: "#fb7185", flexShrink: 0, fontSize: "0.65rem" }}>♥</span>
            ) : null}
          </div>
        </div>
      </Link>

      {/* Confirmation Modal for Quick Removal */}
      <ConfirmModal
        isOpen={showConfirm}
        title="CONFIRM_REMOVAL"
        description={`Are you sure you want to remove "${title}" from your continue watching / watchlist?`}
        confirmText="Remove Entry"
        cancelText="Keep"
        loading={removing}
        onConfirm={executeQuickRemove}
        onClose={() => setShowConfirm(false)}
      />
    </>
  );
}

export default React.memo(MediaCard);
