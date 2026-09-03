"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { MediaDetail, MediaType, UserActivity } from "@/types";
import { useWatchlist } from "@/context/WatchlistContext";

export interface MediaCardProps {
  item: MediaDetail | UserActivity | any;
  onToggleWatchlist?: (id: number) => void;
  showRemove?: boolean;
  onRemove?: () => void;
}

const TYPE_COLORS: Record<string, string> = {
  ANIME: "#8ecf8e",
  MOVIE: "#7ab8cc",
  SERIES: "#c8a96e",
};

function StatusDot({ status }: { status: string }) {
  const isOngoing = status === "ONGOING" || status === "RETURNING SERIES" || status === "WATCHING";
  const isComplete = status === "COMPLETE" || status === "ENDED" || status === "RELEASED";
  const color = isOngoing ? "#8ecf8e" : isComplete ? "rgba(142,207,142,0.4)" : "rgba(142,207,142,0.25)";
  return (
    <span
      style={{
        width: 6,
        height: 6,
        borderRadius: "50%",
        background: color,
        display: "inline-block",
        flexShrink: 0,
        boxShadow: isOngoing ? "0 0 6px #8ecf8e" : "none",
      }}
    />
  );
}

export default function MediaCard({ item, onToggleWatchlist, showRemove, onRemove }: MediaCardProps) {
  const router = useRouter();
  const { isQueued, toggleQueue } = useWatchlist();

  // Normalize ID and MediaType
  const tmdbId = item.tmdbId || item.mediaId || item.id;
  const rawMediaType = (item.mediaType || (item.type ? item.type.toLowerCase() : "movie")) as MediaType;
  const targetType = rawMediaType === "movie" ? "movie" : "tv";

  // Determine Display Type (ANIME | MOVIE | SERIES)
  let displayType: "ANIME" | "MOVIE" | "SERIES" = "MOVIE";
  if (item.type === "ANIME" || item.type === "MOVIE" || item.type === "SERIES") {
    displayType = item.type;
  } else {
    const isAnimation =
      item.genres?.some((g: any) => g.id === 16 || g.name === "Animation" || g.name === "Anime") ||
      (Array.isArray(item.genre) && item.genre.some((g: string) => g.toLowerCase().includes("anime")));
    if (isAnimation) {
      displayType = "ANIME";
    } else if (rawMediaType === "tv") {
      displayType = "SERIES";
    } else {
      displayType = "MOVIE";
    }
  }

  const typeColor = TYPE_COLORS[displayType] || "#8ecf8e";

  // Normalize metadata
  const title = item.title || item.name || "Untitled";
  const year =
    item.year ||
    (item.releaseDate ? item.releaseDate.substring(0, 4) : null) ||
    (item.firstAirDate ? item.firstAirDate.substring(0, 4) : "----");

  const rating =
    typeof item.voteAverage === "number"
      ? item.voteAverage
      : typeof item.rating === "number"
      ? item.rating
      : 0;

  const rawGenres = Array.isArray(item.genres)
    ? item.genres.map((g: any) => (typeof g === "string" ? g : g.name)).filter(Boolean)
    : Array.isArray(item.genre)
    ? item.genre
    : [];

  const genreList = rawGenres.map((g: string) => g.toUpperCase());

  const rawStatus = (item.status || "AVAILABLE").toUpperCase();
  const episodes = item.episodes || item.numberOfEpisodes || item.episodeCount || null;

  const queued = isQueued(targetType, tmdbId);

  // Playback Progress (for continue-watching in watchlist)
  const progressSeconds = item.progress?.timestampSeconds || 0;
  const durationSeconds = item.progress?.durationSeconds || 0;
  const progressPercent =
    durationSeconds > 0
      ? Math.min(100, Math.round((progressSeconds / durationSeconds) * 100))
      : progressSeconds > 0
      ? 50
      : 0;

  const handleCardClick = () => {
    router.push(`/${targetType}/${tmdbId}`);
  };

  const handleQueueClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (onToggleWatchlist) {
      onToggleWatchlist(tmdbId);
    }
    await toggleQueue({
      tmdbId,
      mediaType: targetType,
      title,
      posterPath: item.posterPath,
      backdropPath: item.backdropPath,
    });
    if (showRemove && queued) {
      onRemove?.();
    }
  };

  return (
    <div
      onClick={handleCardClick}
      className="card-hover glow-border entry-animate"
      style={{
        background: "rgba(10, 18, 10, 0.65)",
        padding: "14px",
        cursor: "pointer",
        position: "relative",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        fontFamily: "'JetBrains Mono', 'Share Tech Mono', monospace",
      }}
    >
      {/* Corner Brackets */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: 16,
          height: 16,
          borderTop: `2px solid ${typeColor}`,
          borderLeft: `2px solid ${typeColor}`,
          opacity: 0.75,
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: 0,
          right: 0,
          width: 16,
          height: 16,
          borderBottom: "2px solid rgba(142,207,142,0.25)",
          borderRight: "2px solid rgba(142,207,142,0.25)",
        }}
      />

      {/* Top Header: Title + Type + Year + Queue Toggle Button */}
      <div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            marginBottom: 10,
            gap: 8,
          }}
        >
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontSize: 13,
                fontWeight: 700,
                color: "#8ecf8e",
                letterSpacing: "0.02em",
                marginBottom: 3,
                textShadow: "0 0 8px rgba(142,207,142,0.5)",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
              title={title}
            >
              {title}
            </div>
            <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 600,
                  color: typeColor,
                  letterSpacing: "0.1em",
                  textShadow: `0 0 6px ${typeColor}`,
                }}
              >
                {displayType}
              </span>
              <span style={{ color: "rgba(142,207,142,0.25)", fontSize: 10 }}>·</span>
              <span style={{ fontSize: 10, color: "rgba(142,207,142,0.5)" }}>{year}</span>
            </div>
          </div>

          {/* Queue Button */}
          <button
            onClick={handleQueueClick}
            style={{
              background: queued ? "rgba(142,207,142,0.15)" : "transparent",
              border: `1px solid ${queued ? "rgba(142,207,142,0.6)" : "rgba(142,207,142,0.22)"}`,
              color: queued ? "#8ecf8e" : "rgba(142,207,142,0.45)",
              fontSize: 9,
              padding: "4px 8px",
              cursor: "pointer",
              letterSpacing: "0.08em",
              fontFamily: "inherit",
              transition: "all 0.15s ease",
              flexShrink: 0,
              whiteSpace: "nowrap",
              textShadow: queued ? "0 0 6px rgba(142,207,142,0.5)" : "none",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = "#8ecf8e";
              e.currentTarget.style.color = "#8ecf8e";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = queued ? "rgba(142,207,142,0.6)" : "rgba(142,207,142,0.22)";
              e.currentTarget.style.color = queued ? "#8ecf8e" : "rgba(142,207,142,0.45)";
            }}
          >
            {queued ? "QUEUED" : "+ QUEUE"}
          </button>
        </div>

        {/* Rating Bar */}
        <div style={{ marginBottom: 10 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
            <span style={{ fontSize: 10, color: "rgba(142,207,142,0.45)", letterSpacing: "0.1em" }}>
              RATING
            </span>
            <span style={{ fontSize: 10, fontWeight: 600, color: "#8ecf8e" }}>
              {rating > 0 ? rating.toFixed(1) : "N/A"}
            </span>
          </div>
          <div className="rating-bar">
            <div
              className="rating-bar-fill"
              style={{ width: `${Math.min(100, Math.max(0, (rating / 10) * 100))}%` }}
            />
          </div>
        </div>

        {/* Playback Progress (if watching) */}
        {progressPercent > 0 && (
          <div style={{ marginBottom: 10 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
              <span style={{ fontSize: 9, color: "rgba(142,207,142,0.45)", letterSpacing: "0.08em" }}>
                PROGRESS
              </span>
              <span style={{ fontSize: 9, color: "#8ecf8e" }}>{progressPercent}%</span>
            </div>
            <div style={{ height: 2, background: "rgba(142,207,142,0.15)" }}>
              <div
                style={{
                  height: "100%",
                  width: `${progressPercent}%`,
                  background: "#8ecf8e",
                  boxShadow: "0 0 4px #8ecf8e",
                }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Bottom Row: Genre Tags + Status Dot */}
      <div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 8,
          }}
        >
          <div style={{ display: "flex", gap: 4, flexWrap: "wrap", flex: 1, minWidth: 0 }}>
            {genreList.slice(0, 2).map((g: string) => (
              <span key={g} className="tag" style={{ whiteSpace: "nowrap" }}>
                {g}
              </span>
            ))}
          </div>
          <div style={{ display: "flex", gap: 4, alignItems: "center", flexShrink: 0 }}>
            <StatusDot status={rawStatus} />
            <span
              style={{
                fontSize: 9,
                color: "rgba(142,207,142,0.4)",
                letterSpacing: "0.06em",
                maxWidth: 80,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {rawStatus}
            </span>
          </div>
        </div>

        {episodes && (
          <div
            style={{
              marginTop: 8,
              fontSize: 10,
              color: "rgba(142,207,142,0.3)",
              letterSpacing: "0.06em",
            }}
          >
            {episodes} EPS
          </div>
        )}
      </div>
    </div>
  );
}
