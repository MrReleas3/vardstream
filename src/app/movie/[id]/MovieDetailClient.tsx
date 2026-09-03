"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { MediaDetail, StreamOption, UserActivity } from "@/types";
import Player from "@/components/Player";
import MediaCard from "@/components/MediaCard";
import { useWatchlist } from "@/context/WatchlistContext";

interface MovieDetailClientProps {
  movie: MediaDetail;
  streams: StreamOption[];
  relations: MediaDetail[];
  recommendations: MediaDetail[];
}

export default function MovieDetailClient({
  movie,
  streams,
  relations = [],
  recommendations = [],
}: MovieDetailClientProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [savedActivity, setSavedActivity] = useState<UserActivity | null>(null);
  const { isQueued, toggleQueue } = useWatchlist();

  const queued = isQueued("movie", movie.tmdbId);

  useEffect(() => {
    fetch(`/api/activities/movie/${movie.tmdbId}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.ok && data.data?.activity) {
          setSavedActivity(data.data.activity);
        }
      })
      .catch(() => {});
  }, [movie.tmdbId]);

  const handleStartWatching = () => {
    setIsPlaying(true);
  };

  const handleClosePlayer = () => {
    setIsPlaying(false);
  };

  const releaseYear = movie.releaseDate ? movie.releaseDate.substring(0, 4) : "";
  const savedSeconds = savedActivity?.progress?.timestampSeconds || 0;
  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remainingSecs = secs % 60;
    return `${mins}:${remainingSecs < 10 ? "0" : ""}${remainingSecs}`;
  };

  const isAnimation =
    movie.genres?.some((g: any) => g.id === 16 || g.name === "Animation" || g.name === "Anime");
  const displayType = isAnimation ? "ANIME" : "MOVIE";
  const typeColor = isAnimation ? "#8ecf8e" : "#7ab8cc";

  // When playing, snap immediately to focused player and hide all standard details
  if (isPlaying) {
    return (
      <Player
        streams={streams}
        mediaType="movie"
        tmdbId={movie.tmdbId}
        title={movie.title}
        posterPath={movie.posterPath}
        backdropPath={movie.backdropPath}
        initialProgressSeconds={savedSeconds}
        mediaDetail={movie}
        onClose={handleClosePlayer}
      />
    );
  }

  return (
    <div
      className="page-pad"
      style={{
        maxWidth: 1100,
        margin: "0 auto",
        padding: "24px 20px 100px",
        fontFamily: "'JetBrains Mono', 'Share Tech Mono', monospace",
      }}
    >
      {/* Top Back / Breadcrumb Link */}
      <div style={{ marginBottom: 16 }}>
        <Link
          href="/"
          style={{
            fontSize: 10,
            color: "rgba(142,207,142,0.45)",
            textDecoration: "none",
            letterSpacing: "0.12em",
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            transition: "color 0.15s ease",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = "#8ecf8e";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = "rgba(142,207,142,0.45)";
          }}
        >
          <span>&lt;_</span>
          <span>RETURN_TO_DATABASE</span>
        </Link>
      </div>

      {/* Media Details Terminal Record Panel */}
      <div
        className="glow-border"
        style={{
          background: "rgba(10, 18, 10, 0.7)",
          padding: "24px",
          position: "relative",
          marginBottom: 32,
          overflow: "hidden",
        }}
      >
        {/* Corner Brackets */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: 20,
            height: 20,
            borderTop: `2px solid ${typeColor}`,
            borderLeft: `2px solid ${typeColor}`,
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: 0,
            right: 0,
            width: 20,
            height: 20,
            borderBottom: "2px solid rgba(142, 207, 142, 0.25)",
            borderRight: "2px solid rgba(142, 207, 142, 0.25)",
          }}
        />

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "220px 1fr",
            gap: 28,
            alignItems: "flex-start",
          }}
          className="detail-grid-wrap"
        >
          {/* Left Column: Visual Poster Frame */}
          <div>
            <div
              style={{
                fontSize: 9,
                letterSpacing: "0.14em",
                color: "rgba(142,207,142,0.4)",
                marginBottom: 8,
                textAlign: "center",
              }}
            >
              [ VISUAL FEED ]
            </div>
            {movie.posterPath ? (
              <div
                style={{
                  position: "relative",
                  border: "1px solid rgba(142, 207, 142, 0.25)",
                  overflow: "hidden",
                }}
              >
                <img
                  src={movie.posterPath}
                  alt={movie.title}
                  style={{
                    width: "100%",
                    display: "block",
                    filter: "contrast(1.05) brightness(0.95)",
                  }}
                />
                {/* Subtle Scanline Overlay */}
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    background:
                      "repeating-linear-gradient(to bottom, transparent 0px, transparent 2px, rgba(0,0,0,0.3) 2px, rgba(0,0,0,0.3) 4px)",
                    pointerEvents: "none",
                  }}
                />
              </div>
            ) : (
              <div
                style={{
                  height: 300,
                  border: "1px solid rgba(142, 207, 142, 0.2)",
                  background: "rgba(8,14,8,0.6)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "rgba(142,207,142,0.25)",
                  fontSize: 10,
                  letterSpacing: "0.15em",
                }}
              >
                [ NO SIGNAL ]
              </div>
            )}
          </div>

          {/* Right Column: Specification Telemetry & Record Log */}
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {/* Record Eyebrow */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                fontSize: 9,
                color: "rgba(142, 207, 142, 0.4)",
                letterSpacing: "0.16em",
              }}
            >
              <span>══ RECORD LOG // TMDB-{movie.tmdbId} ══</span>
              <span style={{ color: "rgba(142, 207, 142, 0.2)" }}>·</span>
              <span style={{ color: typeColor, fontWeight: 700 }}>{displayType}</span>
            </div>

            {/* Main Title */}
            <div>
              <h1
                className="glow-text"
                style={{
                  fontSize: "clamp(1.4rem, 3.5vw, 2.2rem)",
                  fontWeight: 700,
                  letterSpacing: "0.04em",
                  lineHeight: 1.15,
                  color: "#8ecf8e",
                  marginBottom: 6,
                }}
              >
                {movie.title}
                {releaseYear && (
                  <span
                    style={{
                      fontSize: "0.65em",
                      fontWeight: 400,
                      color: "rgba(142, 207, 142, 0.45)",
                      marginLeft: 10,
                    }}
                  >
                    ({releaseYear})
                  </span>
                )}
              </h1>
              {movie.tagline && (
                <div
                  style={{
                    fontSize: 11,
                    color: "rgba(142, 207, 142, 0.4)",
                    fontStyle: "italic",
                    letterSpacing: "0.06em",
                  }}
                >
                  // &ldquo;{movie.tagline}&rdquo;
                </div>
              )}
            </div>

            {/* Action Row */}
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", margin: "4px 0" }}>
              <button
                onClick={handleStartWatching}
                style={{
                  background: "rgba(142, 207, 142, 0.15)",
                  border: "1px solid #8ecf8e",
                  color: "#8ecf8e",
                  fontFamily: "inherit",
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: "0.14em",
                  padding: "10px 22px",
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  textShadow: "0 0 10px rgba(142, 207, 142, 0.7)",
                  transition: "all 0.18s ease",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "rgba(142, 207, 142, 0.25)";
                  e.currentTarget.style.boxShadow = "0 0 14px rgba(142, 207, 142, 0.3)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "rgba(142, 207, 142, 0.15)";
                  e.currentTarget.style.boxShadow = "none";
                }}
              >
                <span>▶</span>
                <span>
                  {savedSeconds >= 60
                    ? `RESUME FEED (${formatTime(savedSeconds)})`
                    : "INITIATE STREAM"}
                </span>
              </button>

              <button
                onClick={() =>
                  toggleQueue({
                    tmdbId: movie.tmdbId,
                    mediaType: "movie",
                    title: movie.title,
                    posterPath: movie.posterPath,
                    backdropPath: movie.backdropPath,
                  })
                }
                style={{
                  background: queued ? "rgba(142, 207, 142, 0.15)" : "transparent",
                  border: `1px solid ${queued ? "rgba(142, 207, 142, 0.7)" : "rgba(142, 207, 142, 0.25)"}`,
                  color: queued ? "#8ecf8e" : "rgba(142, 207, 142, 0.5)",
                  fontFamily: "inherit",
                  fontSize: 11,
                  letterSpacing: "0.12em",
                  padding: "10px 20px",
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                  textShadow: queued ? "0 0 8px rgba(142, 207, 142, 0.5)" : "none",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = "#8ecf8e";
                  e.currentTarget.style.color = "#8ecf8e";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = queued
                    ? "rgba(142, 207, 142, 0.7)"
                    : "rgba(142, 207, 142, 0.25)";
                  e.currentTarget.style.color = queued ? "#8ecf8e" : "rgba(142, 207, 142, 0.5)";
                }}
              >
                {queued ? "QUEUED IN WATCHLIST" : "+ ADD TO WATCHLIST"}
              </button>
            </div>

            {/* Spec Sheet Bar */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
                gap: 12,
                padding: "12px 14px",
                background: "rgba(8, 14, 8, 0.8)",
                border: "1px solid rgba(142, 207, 142, 0.15)",
                fontSize: 10,
              }}
            >
              <div>
                <div style={{ color: "rgba(142, 207, 142, 0.35)", letterSpacing: "0.1em", marginBottom: 2 }}>
                  RATING
                </div>
                <div style={{ fontWeight: 700, color: "#8ecf8e" }}>
                  {movie.voteAverage > 0 ? `${movie.voteAverage.toFixed(1)} / 10` : "N/A"}
                </div>
              </div>
              {movie.runtime !== undefined && movie.runtime > 0 && (
                <div>
                  <div style={{ color: "rgba(142, 207, 142, 0.35)", letterSpacing: "0.1em", marginBottom: 2 }}>
                    RUNTIME
                  </div>
                  <div style={{ color: "#8ecf8e" }}>{movie.runtime} MIN</div>
                </div>
              )}
              {movie.releaseDate && (
                <div>
                  <div style={{ color: "rgba(142, 207, 142, 0.35)", letterSpacing: "0.1em", marginBottom: 2 }}>
                    RELEASE_DATE
                  </div>
                  <div style={{ color: "#8ecf8e" }}>{movie.releaseDate}</div>
                </div>
              )}
              <div>
                <div style={{ color: "rgba(142, 207, 142, 0.35)", letterSpacing: "0.1em", marginBottom: 2 }}>
                  STATUS
                </div>
                <div style={{ color: "#8ecf8e" }}>{(movie.status || "AVAILABLE").toUpperCase()}</div>
              </div>
            </div>

            {/* Rating Bar Fill */}
            {movie.voteAverage > 0 && (
              <div>
                <div className="rating-bar">
                  <div
                    className="rating-bar-fill"
                    style={{ width: `${(movie.voteAverage / 10) * 100}%` }}
                  />
                </div>
              </div>
            )}

            {/* Genres */}
            {movie.genres && movie.genres.length > 0 && (
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
                <span style={{ fontSize: 9, color: "rgba(142,207,142,0.35)", letterSpacing: "0.1em" }}>
                  GENRES:
                </span>
                {movie.genres.map((g) => (
                  <span key={g.id} className="tag">
                    {g.name.toUpperCase()}
                  </span>
                ))}
              </div>
            )}

            {/* Synopsis */}
            <div>
              <div
                className="section-header"
                style={{
                  fontSize: 10,
                  fontWeight: 600,
                  letterSpacing: "0.14em",
                  color: "rgba(142, 207, 142, 0.5)",
                  marginBottom: 6,
                }}
              >
                SYNOPSIS // RECORD LOG
              </div>
              <p
                style={{
                  fontSize: 11,
                  lineHeight: 1.65,
                  color: "rgba(142, 207, 142, 0.75)",
                  letterSpacing: "0.02em",
                }}
              >
                {movie.overview || "No overview recorded for this catalog identifier."}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Related Franchise Timeline */}
      {relations && relations.length > 0 && (
        <div style={{ marginBottom: 32 }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              paddingBottom: 8,
              borderBottom: "1px solid rgba(142, 207, 142, 0.12)",
              marginBottom: 14,
            }}
          >
            <span
              className="section-header"
              style={{
                fontSize: 10,
                fontWeight: 600,
                letterSpacing: "0.15em",
                color: "rgba(142, 207, 142, 0.6)",
              }}
            >
              RELATED RECORDS // FRANCHISE TIMELINE
            </span>
            <span style={{ fontSize: 9, color: "rgba(142, 207, 142, 0.3)", letterSpacing: "0.08em" }}>
              {relations.length} CONNECTED
            </span>
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
              gap: 10,
            }}
          >
            {relations.slice(0, 4).map((item) => (
              <MediaCard key={`rel-${item.mediaType}-${item.tmdbId}`} item={item} />
            ))}
          </div>
        </div>
      )}

      {/* System Recommendations */}
      {recommendations && recommendations.length > 0 && (
        <div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              paddingBottom: 8,
              borderBottom: "1px solid rgba(142, 207, 142, 0.12)",
              marginBottom: 14,
            }}
          >
            <span
              className="section-header"
              style={{
                fontSize: 10,
                fontWeight: 600,
                letterSpacing: "0.15em",
                color: "rgba(142, 207, 142, 0.6)",
              }}
            >
              SYSTEM RECOMMENDATIONS // SIMILAR SIGNALS
            </span>
            <span style={{ fontSize: 9, color: "rgba(142, 207, 142, 0.3)", letterSpacing: "0.08em" }}>
              {recommendations.length} MATCHES
            </span>
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
              gap: 10,
            }}
          >
            {recommendations.slice(0, 8).map((item) => (
              <MediaCard key={`rec-${item.mediaType}-${item.tmdbId}`} item={item} />
            ))}
          </div>
        </div>
      )}

      <style jsx>{`
        @media (max-width: 720px) {
          .detail-grid-wrap {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}
