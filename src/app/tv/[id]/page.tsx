"use client";

import React, { useState, useEffect, useRef, Suspense } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Player from "@/components/Player";
import MediaRail from "@/components/MediaRail";
import WatchlistDropdown from "@/components/WatchlistDropdown";
import DetailBentoSkeleton from "@/components/skeletons/DetailBentoSkeleton";
import { MediaDetail, StreamOption, TVEpisode } from "@/types";
import { Star, Tv, Play, Layers, Hash, Calendar, X, Film, Check } from "lucide-react";

export default function TVShowPage() {
  return (
    <Suspense fallback={<DetailBentoSkeleton isTv={true} />}>
      <TVShowPageContent />
    </Suspense>
  );
}

function TVShowPageContent() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const idStr = params.id as string;
  const tmdbId = parseInt(idStr, 10);
  const initialSeasonParam = searchParams.get("season");

  const [show, setShow] = useState<MediaDetail | null>(null);
  const [selectedSeason, setSelectedSeason] = useState(initialSeasonParam ? parseInt(initialSeasonParam, 10) : 1);
  const [selectedEpisode, setSelectedEpisode] = useState(1);
  const [episodes, setEpisodes] = useState<TVEpisode[]>([]);
  const [streams, setStreams] = useState<StreamOption[]>([]);
  const [relations, setRelations] = useState<MediaDetail[]>([]);
  const [recommendations, setRecommendations] = useState<MediaDetail[]>([]);
  const [savedActivity, setSavedActivity] = useState<any>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [loading, setLoading] = useState(true);

  const playerRef = useRef<HTMLDivElement>(null);

  // Fetch show details, relations, recommendations, and user saved progress
  useEffect(() => {
    if (isNaN(tmdbId)) return;

    setLoading(true);

    Promise.all([
      fetch(`/api/content/tv/${tmdbId}`).then((r) => r.json()),
      fetch(`/api/content/tv/${tmdbId}/relations`).then((r) => r.json()).catch(() => null),
      fetch(`/api/content/tv/${tmdbId}/recommendations`).then((r) => r.json()).catch(() => null),
      fetch(`/api/activities/tv/${tmdbId}`).then((r) => (r.ok ? r.json() : null)).catch(() => null),
    ])
      .then(([showData, relData, recsData, actData]) => {
        if (actData?.ok && actData.data?.activity) {
          setSavedActivity(actData.data.activity);
          const lastS = actData.data.activity.progress?.lastSeason;
          const lastE = actData.data.activity.progress?.lastEpisode;
          if (lastS && !initialSeasonParam) {
            setSelectedSeason(lastS);
            if (lastE) setSelectedEpisode(lastE);
          }
        }

        if (showData?.ok && showData.data?.show) {
          setShow(showData.data.show);
          if (!initialSeasonParam && (!actData?.data?.activity?.progress?.lastSeason)) {
            const firstSeason = showData.data.show.seasons?.find((s: any) => s.seasonNumber > 0)?.seasonNumber || 1;
            setSelectedSeason(firstSeason);
          }
        }
        if (relData?.ok && relData.data?.relations) {
          setRelations(relData.data.relations);
        }
        if (recsData?.ok && recsData.data?.recommendations) {
          setRecommendations(recsData.data.recommendations);
        }
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, [tmdbId, initialSeasonParam]);

  // Fetch episodes for current season
  useEffect(() => {
    if (isNaN(tmdbId)) return;

    fetch(`/api/content/tv/${tmdbId}/season/${selectedSeason}`)
      .then((res) => res.json())
      .then((data) => {
        if (data?.ok && data.data?.episodes) {
          setEpisodes(data.data.episodes);
        }
      })
      .catch((err) => console.error(err));
  }, [tmdbId, selectedSeason]);

  // Fetch stream URLs for current episode
  useEffect(() => {
    if (isNaN(tmdbId)) return;

    fetch(`/api/streams/tv/${tmdbId}/${selectedSeason}/${selectedEpisode}`)
      .then((res) => res.json())
      .then((data) => {
        if (data?.ok && data.data?.streams) {
          setStreams(data.data.streams);
        }
      })
      .catch((err) => console.error(err));
  }, [tmdbId, selectedSeason, selectedEpisode]);

  const handleStartWatching = (seasonNum = selectedSeason, epNum = selectedEpisode) => {
    setSelectedSeason(seasonNum);
    setSelectedEpisode(epNum);
    setIsPlaying(true);
    setTimeout(() => {
      playerRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 50);
  };

  const handleClosePlayer = () => {
    setIsPlaying(false);
  };

  if (loading || !show) {
    return <DetailBentoSkeleton isTv={true} />;
  }

  const releaseYear = show.firstAirDate ? show.firstAirDate.substring(0, 4) : "";

  return (
    <div style={{ maxWidth: 1360, margin: "0 auto", padding: "1rem 1rem 5rem 1rem" }}>
      {/* Video Player Section (Only rendered when user initiates playback) */}
      {isPlaying && (
        <div ref={playerRef} style={{ marginBottom: "1.75rem" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "0.5rem 0.75rem",
              background: "var(--bg-surface-elevated)",
              border: "1px solid var(--border-default)",
              borderBottom: "none",
              borderRadius: "var(--radius-xs) var(--radius-xs) 0 0",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span className="badge-mono badge-brand">NOW_PLAYING</span>
              <span style={{ fontSize: "0.82rem", fontWeight: 600 }}>
                {show.title} &mdash; S{selectedSeason}:E{selectedEpisode}
              </span>
            </div>

            <button
              onClick={handleClosePlayer}
              className="btn btn-ghost"
              style={{ padding: "3px 8px", fontSize: "0.75rem", color: "var(--text-muted)", gap: 4 }}
              title="Close Player"
            >
              <X size={13} /> Back to Overview
            </button>
          </div>

          <Player
            key={`${selectedSeason}-${selectedEpisode}`}
            streams={streams}
            mediaType="tv"
            tmdbId={tmdbId}
            season={selectedSeason}
            episode={selectedEpisode}
            title={`${show.title} (S${selectedSeason}:E${selectedEpisode})`}
            posterPath={show.posterPath}
            initialProgressSeconds={
              savedActivity?.progress?.lastSeason === selectedSeason &&
              savedActivity?.progress?.lastEpisode === selectedEpisode
                ? savedActivity?.progress?.timestampSeconds || 0
                : 0
            }
          />
        </div>
      )}

      {/* Show Overview Info Bento with Ambient Backdrop */}
      <div
        className="panel"
        style={{
          position: "relative",
          overflow: "hidden",
          padding: "1.5rem",
          marginBottom: "1.5rem",
          background: "var(--bg-surface)",
        }}
      >
        {/* Ambient Blurred Backdrop */}
        {show.backdropPath && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              backgroundImage: `url(${show.backdropPath})`,
              backgroundSize: "cover",
              backgroundPosition: "center 25%",
              filter: "blur(20px) brightness(0.18)",
              opacity: 0.6,
              transform: "scale(1.1)",
              pointerEvents: "none",
            }}
          />
        )}

        {/* Structural Gradient */}
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
            {show.posterPath ? (
              <img
                src={show.posterPath}
                alt={show.title}
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
                <Tv size={36} color="var(--text-muted)" />
              </div>
            )}
          </div>

          {/* Right: Info Column */}
          <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
            {/* Metadata Pills */}
            <div style={{ display: "flex", alignItems: "center", gap: 5, flexWrap: "wrap" }}>
              <span className="badge-mono badge-brand">TV_SERIES</span>

              {show.voteAverage > 0 && (
                <span className="badge-mono badge-amber">
                  <Star size={9} fill="#fde68a" /> {show.voteAverage.toFixed(1)} / 10
                </span>
              )}

              <span className="badge-mono">
                {show.numberOfSeasons} SEASONS // {show.numberOfEpisodes} EPS
              </span>

              {show.firstAirDate && (
                <span className="badge-mono">
                  <Calendar size={9} /> {show.firstAirDate}
                </span>
              )}

              <span className="badge-mono font-mono" style={{ color: "var(--text-muted)" }}>
                <Hash size={9} /> TMDB_{tmdbId}
              </span>
            </div>

            {/* Title */}
            <h1 style={{ fontSize: "clamp(1.5rem, 3.5vw, 2.2rem)", fontWeight: 800, letterSpacing: "-0.025em" }}>
              {show.title}
              {releaseYear && (
                <span style={{ fontSize: "0.75em", color: "var(--text-muted)", fontWeight: 400, marginLeft: 8 }}>
                  ({releaseYear})
                </span>
              )}
            </h1>

            {show.tagline && (
              <p className="font-mono" style={{ fontSize: "0.84rem", color: "var(--text-muted)", fontStyle: "italic" }}>
                // &ldquo;{show.tagline}&rdquo;
              </p>
            )}

            {/* Action CTA Button Row */}
            <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", flexWrap: "wrap", marginTop: "0.25rem", position: "relative", zIndex: 30 }}>
              <button
                onClick={() => handleStartWatching(selectedSeason, selectedEpisode)}
                className="btn btn-primary"
                style={{ padding: "8px 20px", fontSize: "0.85rem", gap: 7 }}
              >
                <Play size={14} fill="#000" color="#000" />
                {savedActivity?.progress?.lastSeason === selectedSeason &&
                savedActivity?.progress?.lastEpisode === selectedEpisode &&
                (savedActivity?.progress?.timestampSeconds || 0) >= 60
                  ? `Resume S${selectedSeason}:E${selectedEpisode}`
                  : `Watch S${selectedSeason}:E${selectedEpisode}`}
              </button>

              <WatchlistDropdown
                mediaType="tv"
                tmdbId={tmdbId}
                title={show.title}
                posterPath={show.posterPath}
                backdropPath={show.backdropPath}
                variant="button"
              />
            </div>

            {/* Genre Tags */}
            <div style={{ display: "flex", gap: "0.3rem", flexWrap: "wrap", marginTop: "0.25rem" }}>
              {show.genres?.map((g) => (
                <span key={g.id} className="badge-mono" style={{ background: "var(--bg-subtle)" }}>
                  {g.name}
                </span>
              ))}
            </div>

            <div className="divider" style={{ margin: "0.35rem 0" }} />

            {/* Synopsis */}
            <div>
              <h3 className="font-mono" style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginBottom: 6 }}>
                SERIES_OVERVIEW
              </h3>
              <p style={{ color: "var(--text-secondary)", lineHeight: 1.65, fontSize: "0.88rem" }}>
                {show.overview || "No overview documentation available for this series."}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Season & Episode Selector Bento */}
      <div id="episodes-selector" className="panel" style={{ padding: "1.25rem", marginBottom: "2rem", background: "var(--bg-surface)" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: "1rem",
            paddingBottom: "0.65rem",
            borderBottom: "1px solid var(--border-subtle)",
            flexWrap: "wrap",
            gap: 10,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <span className="font-mono" style={{ fontSize: "0.85rem", fontWeight: 700 }}>
              EPISODES
            </span>
            <span className="badge-mono">
              SEASON {selectedSeason} // {episodes.length} EPS
            </span>
          </div>

          {/* Season Segmented Buttons */}
          <div style={{ display: "flex", gap: "0.25rem", overflowX: "auto", maxWidth: "100%", paddingBottom: 2 }}>
            {show.seasons
              ?.map((s) => {
                const isActive = s.seasonNumber === selectedSeason;
                const label = s.seasonNumber === 0 ? "Specials" : `S${s.seasonNumber}`;
                return (
                  <button
                    key={s.id}
                    onClick={() => {
                      setSelectedSeason(s.seasonNumber);
                      setSelectedEpisode(1);
                    }}
                    className="btn btn-ghost"
                    style={{
                      padding: "4px 10px",
                      fontSize: "0.78rem",
                      fontFamily: "var(--font-mono)",
                      background: isActive ? "var(--bg-surface-elevated)" : "var(--bg-subtle)",
                      color: isActive ? "var(--text-primary)" : "var(--text-secondary)",
                      border: isActive ? "1px solid var(--border-strong)" : "1px solid var(--border-subtle)",
                      borderRadius: "var(--radius-xs)",
                    }}
                  >
                    {label}
                  </button>
                );
              })}
          </div>
        </div>

        {/* Episode Grid */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
            gap: "0.65rem",
            maxHeight: 380,
            overflowY: "auto",
            paddingRight: 4,
          }}
        >
          {episodes.map((ep) => {
            const isSelected = selectedEpisode === ep.episodeNumber;
            return (
              <div
                key={ep.id}
                onClick={() => handleStartWatching(selectedSeason, ep.episodeNumber)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.75rem",
                  padding: "0.55rem 0.75rem",
                  background: isSelected ? "var(--bg-surface-elevated)" : "var(--bg-subtle)",
                  border: isSelected ? "1px solid var(--border-strong)" : "1px solid var(--border-subtle)",
                  borderRadius: "var(--radius-xs)",
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                }}
              >
                <div
                  style={{
                    width: 26,
                    height: 26,
                    borderRadius: "var(--radius-xs)",
                    background: isSelected ? "var(--accent-brand)" : "var(--bg-surface)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: isSelected ? "#000" : "var(--text-muted)",
                    fontSize: "0.75rem",
                    fontWeight: 700,
                    fontFamily: "var(--font-mono)",
                    flexShrink: 0,
                  }}
                >
                  {isSelected ? <Play size={12} fill="#000" /> : ep.episodeNumber}
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <h4
                    style={{
                      fontSize: "0.8rem",
                      fontWeight: 600,
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      color: isSelected ? "#fff" : "var(--text-primary)",
                    }}
                  >
                    {ep.episodeNumber}. {ep.name || `Episode ${ep.episodeNumber}`}
                  </h4>
                  {ep.airDate && (
                    <p className="font-mono" style={{ fontSize: "0.68rem", color: "var(--text-muted)", marginTop: 2 }}>
                      {ep.airDate}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 1. RELATIONS & FRANCHISE (Top Hierarchy: Sequels, Prequels, Spin-offs) */}
      {relations && relations.length > 0 && (
        <MediaRail
          title="RELATIONS"
          subtitle="Sequels, prequels & franchise timeline"
          items={relations}
          onCardClick={(item) => {
            if (item.seasonNumber !== undefined) {
              setSelectedSeason(item.seasonNumber);
              setSelectedEpisode(1);
              document.getElementById("episodes-selector")?.scrollIntoView({ behavior: "smooth" });
            } else if (item.href) {
              router.push(item.href);
            }
          }}
        />
      )}

      {/* 2. RECOMMENDATIONS (Below Relations: Curated & Suggested) */}
      {recommendations && recommendations.length > 0 && (
        <MediaRail
          title="RECOMMENDATIONS"
          subtitle="Curated series recommendations"
          items={recommendations}
        />
      )}
    </div>
  );
}
