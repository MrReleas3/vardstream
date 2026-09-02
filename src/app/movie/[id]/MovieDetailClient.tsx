"use client";

import React, { useState, useRef } from "react";
import { MediaDetail, StreamOption, UserActivity } from "@/types";
import Player from "@/components/Player";
import MediaRail from "@/components/MediaRail";
import WatchlistDropdown from "@/components/WatchlistDropdown";
import { Star, Clock, Calendar, Film, Hash, Play } from "lucide-react";

interface MovieDetailClientProps {
  movie: MediaDetail;
  streams: StreamOption[];
  relations: MediaDetail[];
  recommendations: MediaDetail[];
}

export default function MovieDetailClient({
  movie,
  streams,
  relations,
  recommendations,
}: MovieDetailClientProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [savedActivity, setSavedActivity] = useState<UserActivity | null>(null);
  const playerRef = useRef<HTMLDivElement>(null);

  React.useEffect(() => {
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
    setTimeout(() => {
      playerRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 50);
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

  return (
    <div style={{ maxWidth: 1360, margin: "0 auto", padding: "1rem 1rem 5rem 1rem" }}>
      {/* Video Player Section (Only rendered when user clicks "Watch") */}
      {isPlaying && (
        <div ref={playerRef} style={{ marginBottom: "1.75rem" }}>
          <Player
            streams={streams}
            mediaType="movie"
            tmdbId={movie.tmdbId}
            title={movie.title}
            posterPath={movie.posterPath}
            backdropPath={movie.backdropPath}
            initialProgressSeconds={savedSeconds}
            onClose={handleClosePlayer}
          />
        </div>
      )}

      {/* Movie Details Responsive Bento Panel with Ambient Backdrop */}
      <div
        className="panel"
        style={{
          position: "relative",
          overflow: "hidden",
          padding: "1.5rem",
          marginBottom: "2rem",
          background: "var(--bg-surface)",
        }}
      >
        {/* Ambient Blurred Backdrop Effect */}
        {movie.backdropPath && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              backgroundImage: `url(${movie.backdropPath})`,
              backgroundSize: "cover",
              backgroundPosition: "center 25%",
              filter: "blur(20px) brightness(0.18)",
              opacity: 0.6,
              transform: "scale(1.1)",
              pointerEvents: "none",
            }}
          />
        )}

        {/* Structural Overlay */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "linear-gradient(180deg, rgba(18, 19, 22, 0.65) 0%, #121316 100%)",
            pointerEvents: "none",
          }}
        />

        <div className="responsive-detail-grid" style={{ position: "relative", zIndex: 2 }}>
          {/* Left: Poster */}
          <div>
            {movie.posterPath ? (
              <img
                src={movie.posterPath}
                alt={movie.title}
                style={{
                  width: "100%",
                  maxWidth: 240,
                  margin: "0 auto",
                  borderRadius: "var(--radius-xs)",
                  border: "1px solid var(--border-default)",
                  display: "block",
                  boxShadow: "0 10px 30px rgba(0,0,0,0.5)",
                }}
              />
            ) : (
              <div
                style={{
                  width: "100%",
                  maxWidth: 240,
                  height: 320,
                  margin: "0 auto",
                  background: "var(--bg-subtle)",
                  borderRadius: "var(--radius-xs)",
                  border: "1px solid var(--border-default)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Film size={36} color="var(--text-muted)" />
              </div>
            )}
          </div>

          {/* Right: Info Column */}
          <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
            {/* Metadata Pills */}
            <div style={{ display: "flex", alignItems: "center", gap: 5, flexWrap: "wrap" }}>
              <span className="badge-mono badge-brand">FEATURE_FILM</span>

              {movie.voteAverage > 0 && (
                <span className="badge-mono badge-amber">
                  <Star size={9} fill="#fde68a" /> {movie.voteAverage.toFixed(1)} / 10
                </span>
              )}

              {movie.runtime !== undefined && movie.runtime > 0 && (
                <span className="badge-mono">
                  <Clock size={9} /> {movie.runtime}m
                </span>
              )}

              {movie.releaseDate && (
                <span className="badge-mono">
                  <Calendar size={9} /> {movie.releaseDate}
                </span>
              )}

              <span className="badge-mono font-mono" style={{ color: "var(--text-muted)" }}>
                <Hash size={9} /> TMDB_{movie.tmdbId}
              </span>
            </div>

            {/* Title */}
            <h1 style={{ fontSize: "clamp(1.5rem, 3.5vw, 2.2rem)", fontWeight: 800, letterSpacing: "-0.025em" }}>
              {movie.title}
              {releaseYear && (
                <span style={{ fontSize: "0.75em", color: "var(--text-muted)", fontWeight: 400, marginLeft: 8 }}>
                  ({releaseYear})
                </span>
              )}
            </h1>

            {movie.tagline && (
              <p className="font-mono" style={{ fontSize: "0.84rem", color: "var(--text-muted)", fontStyle: "italic" }}>
                {"//"} &ldquo;{movie.tagline}&rdquo;
              </p>
            )}

            {/* Action CTA Button Row */}
            <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", flexWrap: "wrap", marginTop: "0.25rem", position: "relative", zIndex: 30 }}>
              <button
                onClick={handleStartWatching}
                className="btn btn-primary"
                style={{ padding: "8px 20px", fontSize: "0.85rem", gap: 7 }}
              >
                <Play size={14} fill="#000" color="#000" />
                {savedSeconds >= 60 ? `Resume (${formatTime(savedSeconds)})` : "Watch Movie"}
              </button>

              <WatchlistDropdown
                mediaType="movie"
                tmdbId={movie.tmdbId}
                title={movie.title}
                posterPath={movie.posterPath}
                backdropPath={movie.backdropPath}
                variant="button"
              />
            </div>

            {/* Genre Tags */}
            <div style={{ display: "flex", gap: "0.3rem", flexWrap: "wrap", marginTop: "0.25rem" }}>
              {movie.genres?.map((g) => (
                <span key={g.id} className="badge-mono" style={{ background: "var(--bg-subtle)" }}>
                  {g.name}
                </span>
              ))}
            </div>

            <div className="divider" style={{ margin: "0.35rem 0" }} />

            {/* Overview / Synopsis */}
            <div>
              <h3 className="font-mono" style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginBottom: 6 }}>
                SYNOPSIS_OVERVIEW
              </h3>
              <p style={{ color: "var(--text-secondary)", lineHeight: 1.65, fontSize: "0.88rem" }}>
                {movie.overview || "No overview documentation available for this title."}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 1. RELATIONS & FRANCHISE (Top Hierarchy: Sequels, Prequels, Universe Timeline) */}
      {relations && relations.length > 0 && (
        <MediaRail
          title="RELATIONS"
          subtitle="Sequels, prequels & franchise timeline"
          items={relations}
        />
      )}

      {/* 2. RECOMMENDATIONS (Below Relations: Algorithmic & Curated) */}
      {recommendations && recommendations.length > 0 && (
        <MediaRail
          title="RECOMMENDATIONS"
          subtitle="Curated based on this title"
          items={recommendations}
        />
      )}
    </div>
  );
}
