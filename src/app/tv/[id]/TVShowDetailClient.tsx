"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import Player from "@/components/Player";
import MediaCard from "@/components/MediaCard";
import { MediaDetail, StreamOption, TVEpisode } from "@/types";
import { useWatchlist } from "@/context/WatchlistContext";

interface TVShowDetailClientProps {
  show: MediaDetail;
  initialEpisodes: TVEpisode[];
  initialStreams: StreamOption[];
  relations: MediaDetail[];
  recommendations: MediaDetail[];
  initialSeason?: number;
}

export default function TVShowDetailClient({
  show,
  initialEpisodes = [],
  initialStreams = [],
  relations = [],
  recommendations = [],
  initialSeason = 1,
}: TVShowDetailClientProps) {
  const tmdbId = show.tmdbId;

  const [selectedSeason, setSelectedSeason] = useState(initialSeason);
  const [selectedEpisode, setSelectedEpisode] = useState(1);
  const [episodes, setEpisodes] = useState<TVEpisode[]>(initialEpisodes);
  const [streams, setStreams] = useState<StreamOption[]>(initialStreams);
  const [savedActivity, setSavedActivity] = useState<any>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [loadingSeason, setLoadingSeason] = useState(false);

  const { isQueued, toggleQueue } = useWatchlist();
  const queued = isQueued("tv", tmdbId);

  // Fetch user saved activity on mount
  useEffect(() => {
    fetch(`/api/activities/tv/${tmdbId}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((actData) => {
        if (actData?.ok && actData.data?.activity) {
          setSavedActivity(actData.data.activity);
          const lastS = actData.data.activity.progress?.lastSeason;
          const lastE = actData.data.activity.progress?.lastEpisode;
          if (lastS) {
            setSelectedSeason(lastS);
            if (lastE) setSelectedEpisode(lastE);
          }
        }
      })
      .catch(() => {});
  }, [tmdbId]);

  // Fetch episodes & streams when season changes
  const handleSelectSeason = useCallback(
    async (seasonNum: number) => {
      setSelectedSeason(seasonNum);
      setSelectedEpisode(1);
      setLoadingSeason(true);

      try {
        const [episodesRes, streamsRes] = await Promise.all([
          fetch(`/api/content/tv/${tmdbId}/season/${seasonNum}`).then((r) =>
            r.ok ? r.json() : null
          ),
          fetch(`/api/streams/tv/${tmdbId}?season=${seasonNum}&episode=1`).then((r) =>
            r.ok ? r.json() : null
          ),
        ]);

        if (episodesRes?.ok && Array.isArray(episodesRes.data?.episodes)) {
          setEpisodes(episodesRes.data.episodes);
        }
        if (streamsRes?.ok && Array.isArray(streamsRes.data?.streams)) {
          setStreams(streamsRes.data.streams);
        }
      } catch (err) {
        console.error("[TVShowDetailClient] Failed to load season:", err);
      } finally {
        setLoadingSeason(false);
      }
    },
    [tmdbId]
  );

  // Fetch streams when episode changes and transition immediately to playback
  const handleSelectEpisode = useCallback(
    async (seasonNum: number, episodeNum: number) => {
      setSelectedSeason(seasonNum);
      setSelectedEpisode(episodeNum);
      setIsPlaying(true);

      try {
        const res = await fetch(`/api/streams/tv/${tmdbId}?season=${seasonNum}&episode=${episodeNum}`);
        if (res.ok) {
          const data = await res.json();
          if (data?.ok && Array.isArray(data.data?.streams)) {
            setStreams(data.data.streams);
          }
        }
      } catch (err) {
        console.error("[TVShowDetailClient] Failed to load episode stream:", err);
      }
    },
    [tmdbId]
  );

  const handleStartWatching = () => {
    setIsPlaying(true);
  };

  const handleClosePlayer = () => {
    setIsPlaying(false);
  };

  const releaseYear = show.firstAirDate ? show.firstAirDate.substring(0, 4) : "";
  const savedSeconds = savedActivity?.progress?.timestampSeconds || 0;
  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remainingSecs = secs % 60;
    return `${mins}:${remainingSecs < 10 ? "0" : ""}${remainingSecs}`;
  };

  const isAnimation =
    show.genres?.some((g: any) => g.id === 16 || g.name === "Animation" || g.name === "Anime") ||
    (show as any).originalLanguage === "ja";
  const displayType = isAnimation ? "ANIME" : "SERIES";
  const typeColor = isAnimation ? "#8ecf8e" : "#c8a96e";

  const seasonsList = show.seasons?.filter((s) => s.seasonNumber > 0) || [];

  // When playing, snap immediately to focused player and hide all standard details
  if (isPlaying) {
    return (
      <Player
        streams={streams}
        mediaType="tv"
        tmdbId={show.tmdbId}
        season={selectedSeason}
        episode={selectedEpisode}
        title={show.title}
        posterPath={show.posterPath}
        backdropPath={show.backdropPath}
        initialProgressSeconds={savedSeconds}
        seasons={show.seasons as any}
        episodes={episodes}
        selectedSeason={selectedSeason}
        selectedEpisode={selectedEpisode}
        onSelectSeason={handleSelectSeason}
        onSelectEpisode={handleSelectEpisode}
        loadingSeason={loadingSeason}
        mediaDetail={show}
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
            {show.posterPath ? (
              <div
                style={{
                  position: "relative",
                  border: "1px solid rgba(142, 207, 142, 0.25)",
                  overflow: "hidden",
                }}
              >
                <img
                  src={show.posterPath}
                  alt={show.title}
                  style={{
                    width: "100%",
                    display: "block",
                    filter: "contrast(1.05) brightness(0.95)",
                  }}
                />
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
              <span>══ RECORD LOG // TMDB-{show.tmdbId} ══</span>
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
                {show.title}
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
              {show.tagline && (
                <div
                  style={{
                    fontSize: 11,
                    color: "rgba(142, 207, 142, 0.4)",
                    fontStyle: "italic",
                    letterSpacing: "0.06em",
                  }}
                >
                  // &ldquo;{show.tagline}&rdquo;
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
                  {savedActivity?.progress?.lastSeason && savedActivity?.progress?.lastEpisode
                    ? `RESUME S${savedActivity.progress.lastSeason}E${savedActivity.progress.lastEpisode}`
                    : `PLAY S${selectedSeason}E${selectedEpisode}`}
                </span>
              </button>

              <button
                onClick={() =>
                  toggleQueue({
                    tmdbId: show.tmdbId,
                    mediaType: "tv",
                    title: show.title,
                    posterPath: show.posterPath,
                    backdropPath: show.backdropPath,
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
                  {show.voteAverage > 0 ? `${show.voteAverage.toFixed(1)} / 10` : "N/A"}
                </div>
              </div>
              <div>
                <div style={{ color: "rgba(142, 207, 142, 0.35)", letterSpacing: "0.1em", marginBottom: 2 }}>
                  EPISODES
                </div>
                <div style={{ color: "#8ecf8e" }}>
                  {show.numberOfEpisodes || "VARIES"} EPS ({show.numberOfSeasons || 1} SEASONS)
                </div>
              </div>
              {show.firstAirDate && (
                <div>
                  <div style={{ color: "rgba(142, 207, 142, 0.35)", letterSpacing: "0.1em", marginBottom: 2 }}>
                    FIRST_AIR
                  </div>
                  <div style={{ color: "#8ecf8e" }}>{show.firstAirDate}</div>
                </div>
              )}
              <div>
                <div style={{ color: "rgba(142, 207, 142, 0.35)", letterSpacing: "0.1em", marginBottom: 2 }}>
                  STATUS
                </div>
                <div style={{ color: "#8ecf8e" }}>{(show.status || "AVAILABLE").toUpperCase()}</div>
              </div>
            </div>

            {/* Rating Bar Fill */}
            {show.voteAverage > 0 && (
              <div>
                <div className="rating-bar">
                  <div
                    className="rating-bar-fill"
                    style={{ width: `${(show.voteAverage / 10) * 100}%` }}
                  />
                </div>
              </div>
            )}

            {/* Genres */}
            {show.genres && show.genres.length > 0 && (
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
                <span style={{ fontSize: 9, color: "rgba(142,207,142,0.35)", letterSpacing: "0.1em" }}>
                  GENRES:
                </span>
                {show.genres.map((g) => (
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
                {show.overview || "No overview recorded for this catalog identifier."}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Episode Directory Section */}
      <div style={{ marginBottom: 32 }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            paddingBottom: 8,
            borderBottom: "1px solid rgba(142, 207, 142, 0.12)",
            marginBottom: 14,
            flexWrap: "wrap",
            gap: 10,
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
            EPISODE DIRECTORY // SELECT EPISODE FEED
          </span>

          {/* Season Selector Tabs */}
          {seasonsList.length > 1 && (
            <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
              {seasonsList.map((s) => {
                const isActive = s.seasonNumber === selectedSeason;
                return (
                  <button
                    key={s.id || s.seasonNumber}
                    onClick={() => handleSelectSeason(s.seasonNumber)}
                    style={{
                      background: isActive ? "rgba(142, 207, 142, 0.15)" : "transparent",
                      border: `1px solid ${isActive ? "rgba(142, 207, 142, 0.6)" : "rgba(142, 207, 142, 0.2)"}`,
                      color: isActive ? "#8ecf8e" : "rgba(142, 207, 142, 0.4)",
                      fontSize: 9,
                      padding: "4px 8px",
                      cursor: "pointer",
                      fontFamily: "inherit",
                      letterSpacing: "0.08em",
                      fontWeight: isActive ? 700 : 400,
                      transition: "all 0.15s ease",
                    }}
                  >
                    S{String(s.seasonNumber).padStart(2, "0")}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Episode Grid */}
        {loadingSeason ? (
          <div style={{ textAlign: "center", padding: "30px 0", color: "rgba(142,207,142,0.4)" }}>
            <div style={{ fontSize: 10, letterSpacing: "0.15em" }}>FETCHING EPISODE ROSTER...</div>
          </div>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
              gap: 8,
            }}
          >
            {episodes.map((ep) => {
              const isCurrent =
                selectedSeason === ep.seasonNumber && selectedEpisode === ep.episodeNumber;
              return (
                <button
                  key={ep.id || ep.episodeNumber}
                  onClick={() => handleSelectEpisode(ep.seasonNumber, ep.episodeNumber)}
                  style={{
                    background: isCurrent ? "rgba(142, 207, 142, 0.15)" : "rgba(10, 18, 10, 0.6)",
                    border: `1px solid ${isCurrent ? "#8ecf8e" : "rgba(142, 207, 142, 0.18)"}`,
                    color: isCurrent ? "#8ecf8e" : "rgba(142, 207, 142, 0.6)",
                    padding: "10px 12px",
                    cursor: "pointer",
                    textAlign: "left",
                    fontFamily: "inherit",
                    transition: "all 0.15s ease",
                    position: "relative",
                  }}
                  onMouseEnter={(e) => {
                    if (!isCurrent) {
                      e.currentTarget.style.borderColor = "rgba(142, 207, 142, 0.45)";
                      e.currentTarget.style.color = "#8ecf8e";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isCurrent) {
                      e.currentTarget.style.borderColor = "rgba(142, 207, 142, 0.18)";
                      e.currentTarget.style.color = "rgba(142, 207, 142, 0.6)";
                    }
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                    <span style={{ fontSize: 10, fontWeight: 700, color: typeColor }}>
                      EP {String(ep.episodeNumber).padStart(2, "0")}
                    </span>
                    {ep.runtime ? (
                      <span style={{ fontSize: 9, color: "rgba(142, 207, 142, 0.35)" }}>
                        {ep.runtime}M
                      </span>
                    ) : null}
                  </div>
                  <div
                    style={{
                      fontSize: 11,
                      fontWeight: 600,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {ep.name || `Episode ${ep.episodeNumber}`}
                  </div>
                </button>
              );
            })}
          </div>
        )}
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
