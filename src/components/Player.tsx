"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Server,
  AlertTriangle,
  RefreshCw,
  CheckCircle2,
  ShieldAlert,
  Activity,
  RotateCw,
  Maximize2,
  ChevronLeft,
  X,
  ListVideo,
  Play,
} from "lucide-react";
import { MediaType, StreamOption, TVEpisode, TVSeasonSummary } from "@/types";
import WatchlistDropdown from "./WatchlistDropdown";

interface PlayerProps {
  streams: StreamOption[];
  mediaType: MediaType;
  tmdbId: number;
  season?: number;
  episode?: number;
  title: string;
  posterPath?: string | null;
  backdropPath?: string | null;
  initialProgressSeconds?: number;
  seasons?: TVSeasonSummary[];
  episodes?: TVEpisode[];
  selectedSeason?: number;
  selectedEpisode?: number;
  onSelectSeason?: (seasonNum: number) => void;
  onSelectEpisode?: (seasonNum: number, episodeNum: number) => void;
  loadingSeason?: boolean;
  onClose?: () => void;
}

export default function Player({
  streams,
  mediaType,
  tmdbId,
  season,
  episode,
  title,
  posterPath,
  backdropPath,
  initialProgressSeconds = 0,
  seasons = [],
  episodes = [],
  selectedSeason = season || 1,
  selectedEpisode = episode || 1,
  onSelectSeason,
  onSelectEpisode,
  loadingSeason = false,
  onClose,
}: PlayerProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [reportSuccess, setReportSuccess] = useState(false);
  const [isReporting, setIsReporting] = useState(false);

  // Fullscreen & Orientation state (Defaults to true on mobile <= 768px)
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isLandscape, setIsLandscape] = useState(false);
  const [isLandscapeCSS, setIsLandscapeCSS] = useState(false);
  const [showEpisodeDrawer, setShowEpisodeDrawer] = useState(false);
  const [showControlsLandscape, setShowControlsLandscape] = useState(true);

  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const iframeLoadedRef = useRef(false);
  const playerContainerRef = useRef<HTMLDivElement>(null);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const activeStream = streams[currentIndex] || null;

  // Auto-fullscreen on mobile screens (<= 768px)
  useEffect(() => {
    if (typeof window !== "undefined" && window.innerWidth <= 768) {
      setIsFullscreen(true);
    }
  }, []);

  // Manage body scroll based on fullscreen state
  useEffect(() => {
    if (isFullscreen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }

    return () => {
      document.body.style.overflow = "";
      if (typeof document !== "undefined" && document.fullscreenElement) {
        document.exitFullscreen().catch(() => {});
      }
    };
  }, [isFullscreen]);

  // Telemetry Failure Reporting
  const reportFailure = useCallback(
    async (reportType: "auto_switch" | "manual_report" | "load_timeout" | "onerror") => {
      if (!activeStream || isReporting) return;
      setIsReporting(true);

      try {
        await fetch("/api/telemetry/embed-failure", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            mediaId: tmdbId,
            mediaType,
            providerSlug: activeStream.slug,
            reportType,
          }),
        });

        setReportSuccess(true);
        setTimeout(() => setReportSuccess(false), 4000);

        if (currentIndex < streams.length - 1) {
          setCurrentIndex((prev) => prev + 1);
        }
      } catch {}

      setIsReporting(false);
    },
    [activeStream, isReporting, tmdbId, mediaType, currentIndex, streams.length]
  );

  // Activity progress tracker
  useEffect(() => {
    const estimatedDuration = mediaType === "tv" ? 1500 : 5400;
    const halfMark = estimatedDuration * 0.5;
    const completedMark = estimatedDuration * 0.95;

    const sendProgressUpdate = (secs: number) => {
      let autoStatus: string | undefined = undefined;
      if (secs >= completedMark) {
        autoStatus = "completed";
      } else if (secs >= halfMark) {
        autoStatus = "watching";
      }

      fetch(`/api/activities/${mediaType}/${tmdbId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...(autoStatus && { status: autoStatus }),
          title,
          posterPath,
          backdropPath,
          progress: {
            timestampSeconds: secs,
            durationSeconds: estimatedDuration,
            lastSeason: season || selectedSeason || null,
            lastEpisode: episode || selectedEpisode || null,
          },
        }),
      }).catch(() => {});
    };

    let currentSeconds = initialProgressSeconds || 30;
    sendProgressUpdate(currentSeconds);

    const interval = setInterval(() => {
      currentSeconds += 60;
      sendProgressUpdate(currentSeconds);
    }, 60000);

    return () => clearInterval(interval);
  }, [mediaType, tmdbId, season, episode, selectedSeason, selectedEpisode, title, posterPath, backdropPath, initialProgressSeconds]);

  // Canary timeout check
  useEffect(() => {
    iframeLoadedRef.current = false;

    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    if (activeStream) {
      timeoutRef.current = setTimeout(() => {
        if (!iframeLoadedRef.current) {
          console.warn(`[Player Canary] Stream ${activeStream.provider} load timeout. Triggering telemetry.`);
          reportFailure("load_timeout");
        }
      }, 12000);
    }

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [currentIndex, activeStream, reportFailure]);

  const handleIframeLoad = () => {
    iframeLoadedRef.current = true;
  };

  // Orientation Toggle (Portrait <-> Landscape)
  const toggleOrientation = async () => {
    const nextLandscape = !isLandscape;
    setIsLandscape(nextLandscape);

    try {
      if (nextLandscape) {
        const orientationObj = screen?.orientation as ScreenOrientation & {
          lock?: (orientation: string) => Promise<void>;
        };
        if (orientationObj && typeof orientationObj.lock === "function") {
          await orientationObj.lock("landscape").catch(() => {
            setIsLandscapeCSS(true);
          });
        } else {
          setIsLandscapeCSS(true);
        }
      } else {
        if (screen?.orientation?.unlock) {
          screen.orientation.unlock();
        }
        setIsLandscapeCSS(false);
      }
    } catch {
      setIsLandscapeCSS(nextLandscape);
    }
  };

  // Landscape auto-hide HUD controls
  const handleUserActivityInLandscape = () => {
    setShowControlsLandscape(true);
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    controlsTimeoutRef.current = setTimeout(() => {
      setShowControlsLandscape(false);
    }, 4500);
  };

  const getHealthBadge = (health: number) => {
    if (health >= 85) return { color: "#10b981", bg: "rgba(16, 185, 129, 0.12)", border: "rgba(16, 185, 129, 0.3)", status: "OPTIMAL" };
    if (health >= 60) return { color: "#f59e0b", bg: "rgba(245, 158, 11, 0.12)", border: "rgba(245, 158, 11, 0.3)", status: "STABLE" };
    return { color: "#f43f5e", bg: "rgba(244, 63, 94, 0.12)", border: "rgba(244, 63, 94, 0.3)", status: "DEGRADED" };
  };

  if (!streams || streams.length === 0) {
    return (
      <div
        className="panel"
        style={{
          width: "100%",
          aspectRatio: "16/9",
          maxHeight: 650,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "1rem",
          padding: "2rem",
          textAlign: "center",
          background: "var(--bg-surface)",
        }}
      >
        <ShieldAlert size={40} color="var(--accent-rose)" />
        <h3 className="font-mono" style={{ fontSize: "1.1rem" }}>ERR_NO_AVAILABLE_STREAMS</h3>
        <p style={{ color: "var(--text-muted)", maxWidth: 450, fontSize: "0.85rem" }}>
          All provider endpoints tripped circuit breakers or are currently undergoing scheduled maintenance for this title.
        </p>
        {onClose && (
          <button onClick={onClose} className="btn btn-secondary font-mono" style={{ marginTop: "0.5rem" }}>
            <ChevronLeft size={14} /> Back to Overview
          </button>
        )}
      </div>
    );
  }

  // Common Iframe Element
  const renderIframe = () => {
    if (!activeStream) return null;
    return (
      <iframe
        key={activeStream.url}
        src={activeStream.url}
        title={`${title} Player`}
        allowFullScreen
        allow="autoplay; encrypted-media; picture-in-picture"
        style={{ width: "100%", height: "100%", border: "none" }}
        onLoad={handleIframeLoad}
        onError={() => reportFailure("onerror")}
      />
    );
  };

  // Helper: In-Player Episode Drawer
  const renderEpisodeDrawer = () => (
    <div className="inplayer-drawer-overlay" onClick={() => setShowEpisodeDrawer(false)}>
      <div className="inplayer-drawer-panel" onClick={(e) => e.stopPropagation()}>
        <div
          style={{
            padding: "0.75rem 1rem",
            borderBottom: "1px solid var(--border-default)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span className="font-mono" style={{ fontSize: "0.85rem", fontWeight: 700 }}>
              EPISODE LIST
            </span>
            <span className="badge-mono badge-brand">
              SEASON {selectedSeason} {"//"} {episodes.length} EPS
            </span>
          </div>

          <button
            onClick={() => setShowEpisodeDrawer(false)}
            className="btn btn-ghost"
            style={{ padding: "4px", color: "var(--text-muted)" }}
          >
            <X size={18} />
          </button>
        </div>

        {seasons.length > 1 && (
          <div
            style={{
              display: "flex",
              gap: "0.3rem",
              padding: "0.6rem 1rem",
              overflowX: "auto",
              borderBottom: "1px solid var(--border-subtle)",
              background: "var(--bg-subtle)",
            }}
          >
            {seasons.map((s) => {
              const isActive = s.seasonNumber === selectedSeason;
              const label = s.seasonNumber === 0 ? "Specials" : `S${s.seasonNumber}`;
              return (
                <button
                  key={s.id || s.seasonNumber}
                  onClick={() => onSelectSeason?.(s.seasonNumber)}
                  className="btn btn-ghost font-mono"
                  style={{
                    padding: "4px 10px",
                    fontSize: "0.75rem",
                    background: isActive ? "var(--bg-surface-elevated)" : "transparent",
                    color: isActive ? "var(--text-primary)" : "var(--text-secondary)",
                    border: isActive ? "1px solid var(--border-strong)" : "1px solid transparent",
                    borderRadius: "var(--radius-xs)",
                  }}
                >
                  {label}
                </button>
              );
            })}
          </div>
        )}

        <div
          style={{
            padding: "0.75rem 1rem",
            maxHeight: "45vh",
            overflowY: "auto",
            display: "flex",
            flexDirection: "column",
            gap: "0.5rem",
          }}
        >
          {loadingSeason ? (
            <div
              style={{
                padding: "2rem",
                textAlign: "center",
                color: "var(--text-muted)",
                fontFamily: "var(--font-mono)",
                fontSize: "0.8rem",
              }}
            >
              LOADING_EPISODES...
            </div>
          ) : episodes.length === 0 ? (
            <div style={{ padding: "2rem", textAlign: "center", color: "var(--text-muted)", fontSize: "0.8rem" }}>
              No episodes found for this season.
            </div>
          ) : (
            episodes.map((ep) => {
              const isSelected = selectedEpisode === ep.episodeNumber;
              return (
                <div
                  key={ep.id || ep.episodeNumber}
                  onClick={() => {
                    onSelectEpisode?.(selectedSeason, ep.episodeNumber);
                    setShowEpisodeDrawer(false);
                  }}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.75rem",
                    padding: "0.6rem 0.75rem",
                    background: isSelected ? "var(--bg-surface-elevated)" : "var(--bg-subtle)",
                    border: isSelected ? "1px solid var(--accent-brand)" : "1px solid var(--border-subtle)",
                    borderRadius: "var(--radius-xs)",
                    cursor: "pointer",
                    transition: "all 0.15s ease",
                  }}
                >
                  <div
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: "var(--radius-xs)",
                      background: isSelected ? "var(--accent-brand)" : "var(--bg-surface)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: isSelected ? "#000" : "var(--text-muted)",
                      fontSize: "0.78rem",
                      fontWeight: 700,
                      fontFamily: "var(--font-mono)",
                      flexShrink: 0,
                    }}
                  >
                    {isSelected ? <Play size={13} fill="#000" /> : ep.episodeNumber}
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <h4
                      style={{
                        fontSize: "0.82rem",
                        fontWeight: 600,
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        color: isSelected ? "#ffffff" : "var(--text-primary)",
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
            })
          )}
        </div>
      </div>
    </div>
  );

  // =========================================================================
  // 1. LANDSCAPE FULLSCREEN VIEW
  // =========================================================================
  if (isFullscreen && isLandscape) {
    return (
      <div
        ref={playerContainerRef}
        className={`player-landscape-view ${isLandscapeCSS ? "player-landscape-css-rotated" : ""}`}
        onClick={handleUserActivityInLandscape}
        onMouseMove={handleUserActivityInLandscape}
      >
        <div className="player-landscape-video-frame">
          {renderIframe()}
        </div>

        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            zIndex: 30,
            padding: "0.75rem 1rem",
            background: "linear-gradient(180deg, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0) 100%)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            opacity: showControlsLandscape ? 1 : 0,
            pointerEvents: showControlsLandscape ? "auto" : "none",
            transition: "opacity 0.25s ease",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <button
              onClick={() => {
                if (onClose) onClose();
                else setIsFullscreen(false);
              }}
              className="btn btn-secondary"
              style={{ padding: "4px 10px", fontSize: "0.75rem", fontFamily: "var(--font-mono)", gap: 4 }}
            >
              <ChevronLeft size={14} /> EXIT
            </button>

            <span className="badge-mono badge-brand">NOW_PLAYING</span>
            <span
              style={{
                fontSize: "0.82rem",
                fontWeight: 600,
                color: "#fff",
                maxWidth: 300,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {title}
            </span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {mediaType === "tv" && episodes.length > 0 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowEpisodeDrawer(true);
                }}
                className="btn btn-brand"
                style={{ padding: "4px 10px", fontSize: "0.75rem", fontFamily: "var(--font-mono)", gap: 5 }}
              >
                <ListVideo size={13} /> S{selectedSeason}:E{selectedEpisode}
              </button>
            )}

            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleOrientation();
              }}
              className="btn btn-secondary font-mono"
              style={{ padding: "4px 10px", fontSize: "0.75rem", gap: 5 }}
              title="Switch to Portrait Mode"
            >
              <RotateCw size={13} /> PORTRAIT
            </button>
          </div>
        </div>

        {showEpisodeDrawer && renderEpisodeDrawer()}
      </div>
    );
  }

  // =========================================================================
  // 2. PORTRAIT FULLSCREEN VIEW (DEFAULT FOCUS ON MOBILE)
  // =========================================================================
  if (isFullscreen) {
    return (
      <div ref={playerContainerRef} className="player-fullscreen-wrapper">
        <div className="player-portrait-view">
          {/* Top Bar HUD */}
          <div
            style={{
              padding: "0.6rem 0.75rem",
              background: "#121316",
              borderBottom: "1px solid var(--border-default)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              zIndex: 30,
              gap: 8,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0 }}>
              <button
                onClick={() => {
                  if (onClose) onClose();
                  else setIsFullscreen(false);
                }}
                className="btn btn-secondary font-mono"
                style={{ padding: "4px 8px", fontSize: "0.72rem", gap: 4 }}
                title="Exit Player"
              >
                <ChevronLeft size={14} /> BACK
              </button>

              <div style={{ display: "flex", alignItems: "center", gap: 5, overflow: "hidden" }}>
                <span className="badge-mono badge-brand" style={{ fontSize: "0.65rem" }}>
                  PLAYING
                </span>
                <span
                  style={{
                    fontSize: "0.78rem",
                    fontWeight: 600,
                    color: "var(--text-primary)",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {title}
                </span>
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
              <button
                onClick={toggleOrientation}
                className="btn btn-brand font-mono"
                style={{ padding: "4px 9px", fontSize: "0.72rem", gap: 5 }}
                title="Switch to Fullscreen Landscape"
              >
                <RotateCw size={12} /> LANDSCAPE
              </button>

              <button
                onClick={() => {
                  if (onClose) onClose();
                  else setIsFullscreen(false);
                }}
                className="btn btn-ghost"
                style={{ padding: "4px", color: "var(--text-muted)" }}
                title="Close"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Sticky Video Canvas (Top Half of Portrait Mobile) */}
          <div className="player-portrait-video-frame">
            {renderIframe()}
          </div>

          {/* Under-Player In-HUD Controls & Actions */}
          <div style={{ padding: "0.75rem", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            {mediaType === "tv" && (
              <div
                className="panel"
                style={{
                  padding: "0.6rem 0.85rem",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  background: "var(--bg-surface)",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <ListVideo size={16} color="var(--accent-brand)" />
                  <div>
                    <div className="font-mono" style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>
                      CURRENT EPISODE
                    </div>
                    <div style={{ fontSize: "0.82rem", fontWeight: 600 }}>
                      Season {selectedSeason} &bull; Episode {selectedEpisode}
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => setShowEpisodeDrawer(true)}
                  className="btn btn-secondary font-mono"
                  style={{ padding: "5px 12px", fontSize: "0.75rem", gap: 5, borderColor: "var(--accent-brand)" }}
                >
                  <ListVideo size={13} /> SELECT EPISODE
                </button>
              </div>
            )}

            {/* Server Route Switcher & Health Controls */}
            <div
              className="panel"
              style={{
                padding: "0.75rem",
                display: "flex",
                flexDirection: "column",
                gap: "0.65rem",
                background: "var(--bg-surface)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 6 }}>
                <span className="font-mono" style={{ fontSize: "0.72rem", color: "var(--text-muted)", display: "flex", alignItems: "center", gap: 4 }}>
                  <Server size={12} /> ROUTE PROVIDER:
                </span>

                {activeStream && (
                  <span
                    className="badge-mono"
                    style={{
                      background: getHealthBadge(activeStream.health).bg,
                      borderColor: getHealthBadge(activeStream.health).border,
                      color: getHealthBadge(activeStream.health).color,
                      fontSize: "0.68rem",
                    }}
                  >
                    <Activity size={10} /> {activeStream.health}% HEALTH {"//"} {getHealthBadge(activeStream.health).status}
                  </span>
                )}
              </div>

              <div style={{ display: "flex", gap: "0.35rem", flexWrap: "wrap" }}>
                {streams.map((st, idx) => {
                  const badge = getHealthBadge(st.health);
                  const isSelected = idx === currentIndex;

                  return (
                    <button
                      key={st.slug}
                      onClick={() => setCurrentIndex(idx)}
                      className="btn"
                      style={{
                        padding: "4px 8px",
                        fontSize: "0.75rem",
                        fontFamily: "var(--font-mono)",
                        background: isSelected ? "var(--bg-surface-elevated)" : "var(--bg-subtle)",
                        color: isSelected ? "var(--text-primary)" : "var(--text-secondary)",
                        border: isSelected ? "1px solid var(--border-strong)" : "1px solid var(--border-subtle)",
                        borderRadius: "var(--radius-xs)",
                        display: "flex",
                        alignItems: "center",
                        gap: 5,
                      }}
                    >
                      <span
                        style={{
                          width: 6,
                          height: 6,
                          borderRadius: "50%",
                          background: badge.color,
                        }}
                      />
                      <span>{st.provider}</span>
                      <span style={{ color: "var(--text-muted)", fontSize: "0.68rem" }}>{st.health}%</span>
                    </button>
                  );
                })}
              </div>

              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 6, marginTop: 4 }}>
                <WatchlistDropdown
                  mediaType={mediaType}
                  tmdbId={tmdbId}
                  title={title}
                  posterPath={posterPath}
                  backdropPath={backdropPath}
                  variant="button"
                />

                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <button
                    onClick={async () => {
                      try {
                        await fetch(`/api/activities/${mediaType}/${tmdbId}`, {
                          method: "PUT",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({
                            status: "completed",
                            title,
                            posterPath,
                            backdropPath,
                            progress: {
                              timestampSeconds: mediaType === "tv" ? 1500 : 5400,
                              durationSeconds: mediaType === "tv" ? 1500 : 5400,
                              lastSeason: season || selectedSeason || null,
                              lastEpisode: episode || selectedEpisode || null,
                            },
                          }),
                        });
                        setReportSuccess(false);
                      } catch {}
                    }}
                    className="btn btn-secondary font-mono"
                    style={{ padding: "4px 8px", fontSize: "0.72rem", gap: 4 }}
                    title="Mark this title as completed"
                  >
                    <CheckCircle2 size={11} color="var(--accent-emerald)" /> MARK_DONE
                  </button>

                  <button
                    onClick={() => reportFailure("manual_report")}
                    disabled={isReporting}
                    className="btn btn-danger font-mono"
                    style={{ padding: "4px 8px", fontSize: "0.72rem", gap: 4 }}
                    title="Trigger failover canary to next provider"
                  >
                    {isReporting ? (
                      <RefreshCw size={11} className="animate-spin" />
                    ) : reportSuccess ? (
                      <>
                        <CheckCircle2 size={11} /> REPORTED
                      </>
                    ) : (
                      <>
                        <AlertTriangle size={11} /> REPORT_BROKEN
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {showEpisodeDrawer && renderEpisodeDrawer()}
      </div>
    );
  }

  // =========================================================================
  // 3. STANDARD DESKTOP EMBEDDED VIEW
  // =========================================================================
  return (
    <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
      <div
        style={{
          position: "relative",
          width: "100%",
          aspectRatio: "16/9",
          maxHeight: 700,
          background: "#000000",
          borderRadius: "var(--radius-xs)",
          overflow: "hidden",
          border: "1px solid var(--border-default)",
        }}
      >
        {renderIframe()}

        <button
          onClick={() => setIsFullscreen(true)}
          className="btn btn-secondary font-mono"
          style={{
            position: "absolute",
            top: 10,
            right: 10,
            zIndex: 10,
            padding: "4px 8px",
            fontSize: "0.72rem",
            background: "rgba(9, 9, 11, 0.85)",
            backdropFilter: "blur(4px)",
            gap: 4,
          }}
          title="Open Immersive Fullscreen Focus Mode"
        >
          <Maximize2 size={12} /> FULLSCREEN FOCUS
        </button>
      </div>

      <div
        className="panel"
        style={{
          padding: "0.75rem 1rem",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "0.75rem",
          background: "var(--bg-surface)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
          <span
            className="font-mono"
            style={{
              fontSize: "0.72rem",
              color: "var(--text-muted)",
              display: "flex",
              alignItems: "center",
              gap: 4,
              marginRight: 4,
            }}
          >
            <Server size={13} /> ROUTE:
          </span>

          {streams.map((st, idx) => {
            const badge = getHealthBadge(st.health);
            const isSelected = idx === currentIndex;

            return (
              <button
                key={st.slug}
                onClick={() => setCurrentIndex(idx)}
                className="btn"
                style={{
                  padding: "4px 10px",
                  fontSize: "0.78rem",
                  fontFamily: "var(--font-mono)",
                  background: isSelected ? "var(--bg-surface-elevated)" : "var(--bg-subtle)",
                  color: isSelected ? "var(--text-primary)" : "var(--text-secondary)",
                  border: isSelected ? "1px solid var(--border-strong)" : "1px solid var(--border-subtle)",
                  borderRadius: "var(--radius-xs)",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <span
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: "50%",
                    background: badge.color,
                  }}
                />
                <span>{st.provider}</span>
                <span style={{ color: "var(--text-muted)", fontSize: "0.7rem" }}>{st.health}%</span>
              </button>
            );
          })}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
          {activeStream && (
            <span
              className="badge-mono"
              style={{
                background: getHealthBadge(activeStream.health).bg,
                borderColor: getHealthBadge(activeStream.health).border,
                color: getHealthBadge(activeStream.health).color,
              }}
            >
              <Activity size={11} /> {activeStream.health}% HEALTH {"//"} {getHealthBadge(activeStream.health).status}
            </span>
          )}

          <button
            onClick={async () => {
              try {
                await fetch(`/api/activities/${mediaType}/${tmdbId}`, {
                  method: "PUT",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    status: "completed",
                    title,
                    posterPath,
                    backdropPath,
                    progress: {
                      timestampSeconds: mediaType === "tv" ? 1500 : 5400,
                      durationSeconds: mediaType === "tv" ? 1500 : 5400,
                      lastSeason: season || selectedSeason || null,
                      lastEpisode: episode || selectedEpisode || null,
                    },
                  }),
                });
                setReportSuccess(false);
              } catch {}
            }}
            className="btn btn-secondary font-mono"
            style={{ padding: "4px 10px", fontSize: "0.75rem", gap: 4 }}
            title="Mark this title as completed"
          >
            <CheckCircle2 size={12} color="var(--accent-emerald)" /> MARK_DONE
          </button>

          <button
            onClick={() => reportFailure("manual_report")}
            disabled={isReporting}
            className="btn btn-danger"
            style={{ padding: "4px 10px", fontSize: "0.75rem", fontFamily: "var(--font-mono)" }}
            title="Trigger automated failover canary to next provider"
          >
            {isReporting ? (
              <RefreshCw size={12} className="animate-spin" />
            ) : reportSuccess ? (
              <>
                <CheckCircle2 size={12} /> FAILOVER_REPORTED
              </>
            ) : (
              <>
                <AlertTriangle size={12} /> REPORT_BROKEN
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
