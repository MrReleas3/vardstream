"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Server,
  AlertTriangle,
  RefreshCw,
  CheckCircle2,
  Maximize2,
  X,
  ListVideo,
  Info,
  Sparkles,
} from "lucide-react";
import { MediaType, StreamOption, TVEpisode, TVSeasonSummary, MediaDetail } from "@/types";
import { useWatchlist } from "@/context/WatchlistContext";
import CustomVideoPlayer from "./CustomVideoPlayer";
import { DirectStreamResult } from "@/lib/nano-api";

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
  mediaDetail?: MediaDetail;
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
  mediaDetail,
  onClose,
}: PlayerProps) {
  // Player mode: Direct play via Nano API is DEFAULT before embeds
  const [playerMode, setPlayerMode] = useState<"direct" | "embed">("direct");
  const [directStream, setDirectStream] = useState<DirectStreamResult | null>(null);
  const [isLoadingDirect, setIsLoadingDirect] = useState<boolean>(true);
  const [directError, setDirectError] = useState<string | null>(null);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [reportSuccess, setReportSuccess] = useState(false);
  const [isReporting, setIsReporting] = useState(false);
  const { isQueued, toggleQueue } = useWatchlist();
  const queued = isQueued(mediaType, tmdbId);

  // In-Player Menu Overlay state
  const [showOpsMenu, setShowOpsMenu] = useState(false);
  const [activeOpsTab, setActiveOpsTab] = useState<"episodes" | "sources" | "details">(
    mediaType === "tv" ? "episodes" : "sources"
  );

  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const iframeLoadedRef = useRef(false);
  const playerContainerRef = useRef<HTMLDivElement>(null);

  const activeStream = streams[currentIndex] || null;

  // Add playback-active class to body
  useEffect(() => {
    document.body.classList.add("playback-active");
    return () => {
      document.body.classList.remove("playback-active");
    };
  }, []);

  // Fetch direct stream from Nano API (Default before embeds)
  useEffect(() => {
    let isCancelled = false;

    const queryParams = new URLSearchParams({
      tmdb_id: String(tmdbId),
      type: mediaType,
    });
    if (mediaType === "tv") {
      queryParams.set("season", String(selectedSeason));
      queryParams.set("episode", String(selectedEpisode));
    }

    fetch(`/api/streams/direct?${queryParams.toString()}`)
      .then((res) => res.json())
      .then((resData) => {
        if (isCancelled) return;
        if (resData?.ok && resData.data?.streamUrl) {
          setDirectStream(resData.data);
          setPlayerMode("direct");
          setDirectError(null);
        } else {
          setDirectError(resData?.error?.message || "Direct stream not available");
          setPlayerMode("embed"); // Gracefully fall back to embed
        }
      })
      .catch((err: unknown) => {
        if (isCancelled) return;
        const msg = err instanceof Error ? err.message : "Failed to load direct stream";
        setDirectError(msg);
        setPlayerMode("embed");
      })
      .finally(() => {
        if (!isCancelled) {
          setIsLoadingDirect(false);
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [tmdbId, mediaType, selectedSeason, selectedEpisode]);

  // Keyboard shortcut listener ('M' for menu, 'Escape' to close menu or player)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      if (e.key === "m" || e.key === "M") {
        e.preventDefault();
        setShowOpsMenu((prev) => !prev);
      } else if (e.key === "Escape") {
        e.preventDefault();
        if (showOpsMenu) {
          setShowOpsMenu(false);
        } else if (onClose) {
          onClose();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [showOpsMenu, onClose]);

  // Native Fullscreen Toggle for Embed Mode
  const toggleNativeFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        if (playerContainerRef.current?.requestFullscreen) {
          await playerContainerRef.current.requestFullscreen();
        }
      } else {
        if (document.exitFullscreen) {
          await document.exitFullscreen();
        }
      }
    } catch (err) {
      console.error("Failed to toggle native fullscreen:", err);
    }
  };

  // Telemetry Failure Reporting for Embeds
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

  // Fallback activity progress tracker when in embed mode
  useEffect(() => {
    if (playerMode === "direct") return; // CustomVideoPlayer tracks accurate progress

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
  }, [
    playerMode,
    mediaType,
    tmdbId,
    season,
    episode,
    selectedSeason,
    selectedEpisode,
    title,
    posterPath,
    backdropPath,
    initialProgressSeconds,
  ]);

  // Canary timeout check for embed iframe
  useEffect(() => {
    if (playerMode !== "embed") return;
    iframeLoadedRef.current = false;

    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    timeoutRef.current = setTimeout(() => {
      if (!iframeLoadedRef.current) {
        reportFailure("load_timeout");
      }
    }, 15000);

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [playerMode, currentIndex, reportFailure]);

  const handleIframeLoad = () => {
    iframeLoadedRef.current = true;
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
  };

  const getHealthBadge = (health: number) => {
    if (health >= 85)
      return {
        color: "#10b981",
        bg: "rgba(16, 185, 129, 0.12)",
        border: "rgba(16, 185, 129, 0.3)",
        status: "OPTIMAL",
      };
    if (health >= 60)
      return {
        color: "#f59e0b",
        bg: "rgba(245, 158, 11, 0.12)",
        border: "rgba(245, 158, 11, 0.3)",
        status: "STABLE",
      };
    return {
      color: "#f43f5e",
      bg: "rgba(244, 63, 94, 0.12)",
      border: "rgba(244, 63, 94, 0.3)",
      status: "DEGRADED",
    };
  };

  const currentEpisodeObj = episodes.find((e) => e.episodeNumber === selectedEpisode);

  // Common Iframe Element for embed mode
  const renderIframe = () => {
    if (!activeStream) return null;
    return (
      <iframe
        key={activeStream.url}
        src={activeStream.url}
        title={`${title} Player`}
        allowFullScreen
        allow="autoplay; encrypted-media; picture-in-picture"
        style={{
          width: "100%",
          height: "100%",
          border: "none",
          display: "block",
          background: "#000",
        }}
        onLoad={handleIframeLoad}
        onError={() => reportFailure("onerror")}
      />
    );
  };

  // Reusable In-Player Ops Menu Modal (Used in both Direct and Embed modes)
  const renderOpsMenuModal = () => (
    <div
      className="entry-animate"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 2500,
        background: "rgba(6, 12, 6, 0.95)",
        backdropFilter: "blur(14px)",
        display: "flex",
        flexDirection: "column",
        padding: "20px 24px",
        overflowY: "auto",
        fontFamily: "'JetBrains Mono', 'Share Tech Mono', monospace",
      }}
    >
      {/* Corner Brackets */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: 24,
          height: 24,
          borderTop: "2px solid #8ecf8e",
          borderLeft: "2px solid #8ecf8e",
          pointerEvents: "none",
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: 0,
          right: 0,
          width: 24,
          height: 24,
          borderBottom: "2px solid #8ecf8e",
          borderRight: "2px solid #8ecf8e",
          pointerEvents: "none",
        }}
      />

      {/* In-Player Menu Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          paddingBottom: 14,
          borderBottom: "1px solid rgba(142, 207, 142, 0.2)",
          marginBottom: 18,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span
            style={{
              width: 6,
              height: 6,
              borderRadius: "50%",
              background: "#8ecf8e",
              boxShadow: "0 0 6px #8ecf8e",
            }}
          />
          <span
            className="glow-text"
            style={{
              color: "#8ecf8e",
              fontWeight: 700,
              fontSize: 12,
              letterSpacing: "0.14em",
            }}
          >
            ══ IN-PLAYER OPS MENU // SESSION MANAGER ══
          </span>
        </div>

        <button
          onClick={() => setShowOpsMenu(false)}
          style={{
            background: "transparent",
            border: "1px solid rgba(142, 207, 142, 0.35)",
            color: "#8ecf8e",
            fontFamily: "inherit",
            fontSize: 10,
            letterSpacing: "0.1em",
            padding: "4px 10px",
            cursor: "pointer",
          }}
        >
          [X] RETURN TO STREAM
        </button>
      </div>

      {/* Navigation Tabs (Episode Picker, Source Picker, Quick Details) */}
      <div
        style={{
          display: "flex",
          gap: 6,
          marginBottom: 20,
          flexWrap: "wrap",
        }}
      >
        {mediaType === "tv" && (
          <button
            onClick={() => setActiveOpsTab("episodes")}
            style={{
              background:
                activeOpsTab === "episodes"
                  ? "rgba(142, 207, 142, 0.2)"
                  : "rgba(142, 207, 142, 0.05)",
              border: `1px solid ${activeOpsTab === "episodes" ? "#8ecf8e" : "rgba(142, 207, 142, 0.2)"}`,
              color: activeOpsTab === "episodes" ? "#8ecf8e" : "rgba(142, 207, 142, 0.5)",
              fontFamily: "inherit",
              fontSize: 11,
              fontWeight: activeOpsTab === "episodes" ? 700 : 400,
              letterSpacing: "0.12em",
              padding: "8px 18px",
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              textShadow:
                activeOpsTab === "episodes" ? "0 0 8px rgba(142, 207, 142, 0.6)" : "none",
            }}
          >
            <ListVideo size={13} />
            <span>1. EPISODE PICKER</span>
            {episodes.length > 0 && (
              <span style={{ fontSize: 9, opacity: 0.6 }}>({episodes.length})</span>
            )}
          </button>
        )}

        <button
          onClick={() => setActiveOpsTab("sources")}
          style={{
            background:
              activeOpsTab === "sources"
                ? "rgba(142, 207, 142, 0.2)"
                : "rgba(142, 207, 142, 0.05)",
            border: `1px solid ${activeOpsTab === "sources" ? "#8ecf8e" : "rgba(142, 207, 142, 0.2)"}`,
            color: activeOpsTab === "sources" ? "#8ecf8e" : "rgba(142, 207, 142, 0.5)",
            fontFamily: "inherit",
            fontSize: 11,
            fontWeight: activeOpsTab === "sources" ? 700 : 400,
            letterSpacing: "0.12em",
            padding: "8px 18px",
            cursor: "pointer",
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            textShadow:
              activeOpsTab === "sources" ? "0 0 8px rgba(142, 207, 142, 0.6)" : "none",
          }}
        >
          <Server size={13} />
          <span>2. SOURCE PICKER</span>
          <span style={{ fontSize: 9, opacity: 0.6 }}>({streams.length + 1} SOURCES)</span>
        </button>

        <button
          onClick={() => setActiveOpsTab("details")}
          style={{
            background:
              activeOpsTab === "details"
                ? "rgba(142, 207, 142, 0.2)"
                : "rgba(142, 207, 142, 0.05)",
            border: `1px solid ${activeOpsTab === "details" ? "#8ecf8e" : "rgba(142, 207, 142, 0.2)"}`,
            color: activeOpsTab === "details" ? "#8ecf8e" : "rgba(142, 207, 142, 0.5)",
            fontFamily: "inherit",
            fontSize: 11,
            fontWeight: activeOpsTab === "details" ? 700 : 400,
            letterSpacing: "0.12em",
            padding: "8px 18px",
            cursor: "pointer",
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            textShadow:
              activeOpsTab === "details" ? "0 0 8px rgba(142, 207, 142, 0.6)" : "none",
          }}
        >
          <Info size={13} />
          <span>3. RECORD DETAILS</span>
        </button>
      </div>

      {/* Tab 1 Body: Episode Picker */}
      {activeOpsTab === "episodes" && mediaType === "tv" && (
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 14 }}>
          {/* Season Selector */}
          {seasons.length > 1 && (
            <div
              style={{
                display: "flex",
                gap: 6,
                alignItems: "center",
                flexWrap: "wrap",
                paddingBottom: 10,
                borderBottom: "1px solid rgba(142, 207, 142, 0.12)",
              }}
            >
              <span
                style={{
                  fontSize: 10,
                  color: "rgba(142,207,142,0.4)",
                  letterSpacing: "0.1em",
                  marginRight: 6,
                }}
              >
                SEASONS:
              </span>
              {seasons.map((s) => {
                const isActive = s.seasonNumber === selectedSeason;
                return (
                  <button
                    key={s.id || s.seasonNumber}
                    onClick={() => onSelectSeason?.(s.seasonNumber)}
                    style={{
                      background: isActive ? "rgba(142, 207, 142, 0.2)" : "transparent",
                      border: `1px solid ${isActive ? "#8ecf8e" : "rgba(142, 207, 142, 0.25)"}`,
                      color: isActive ? "#8ecf8e" : "rgba(142, 207, 142, 0.5)",
                      fontFamily: "inherit",
                      fontSize: 10,
                      padding: "4px 10px",
                      cursor: "pointer",
                      fontWeight: isActive ? 700 : 400,
                    }}
                  >
                    S{String(s.seasonNumber).padStart(2, "0")}
                  </button>
                );
              })}
            </div>
          )}

          {/* Episodes Grid */}
          {loadingSeason ? (
            <div
              style={{
                padding: "40px 0",
                textAlign: "center",
                color: "rgba(142,207,142,0.5)",
                letterSpacing: "0.15em",
                fontSize: 11,
              }}
            >
              FETCHING EPISODE FEEDS...
            </div>
          ) : (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
                gap: 8,
                maxHeight: "calc(100vh - 230px)",
                overflowY: "auto",
                paddingRight: 6,
              }}
            >
              {episodes.map((ep) => {
                const isCurrent =
                  ep.seasonNumber === selectedSeason &&
                  ep.episodeNumber === selectedEpisode;
                return (
                  <button
                    key={ep.id || ep.episodeNumber}
                    onClick={() => {
                      onSelectEpisode?.(ep.seasonNumber, ep.episodeNumber);
                      setShowOpsMenu(false);
                      setPlayerMode("direct"); // Default to direct play on new episode
                    }}
                    style={{
                      background: isCurrent
                        ? "rgba(142, 207, 142, 0.18)"
                        : "rgba(10, 18, 10, 0.75)",
                      border: `1px solid ${isCurrent ? "#8ecf8e" : "rgba(142, 207, 142, 0.18)"}`,
                      color: isCurrent ? "#8ecf8e" : "rgba(142, 207, 142, 0.65)",
                      padding: "10px 12px",
                      cursor: "pointer",
                      textAlign: "left",
                      fontFamily: "inherit",
                      transition: "all 0.15s ease",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        marginBottom: 4,
                      }}
                    >
                      <span style={{ fontSize: 10, fontWeight: 700, color: "#8ecf8e" }}>
                        EP {String(ep.episodeNumber).padStart(2, "0")}
                      </span>
                      {isCurrent ? (
                        <span
                          style={{
                            fontSize: 9,
                            color: "#8ecf8e",
                            fontWeight: 700,
                            letterSpacing: "0.08em",
                          }}
                        >
                          ▶ ACTIVE STREAM
                        </span>
                      ) : ep.runtime ? (
                        <span style={{ fontSize: 9, color: "rgba(142,207,142,0.35)" }}>
                          {ep.runtime}M
                        </span>
                      ) : null}
                    </div>
                    <div
                      style={{
                        fontSize: 11,
                        fontWeight: 600,
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
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
      )}

      {/* Tab 2 Body: Source Picker */}
      {activeOpsTab === "sources" && (
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ fontSize: 10, color: "rgba(142,207,142,0.4)", letterSpacing: "0.12em" }}>
            &gt;&gt; ACTIVE STREAM ENGINE &amp; PROVIDER MATRIX // SWITCH ROUTE:
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
              gap: 12,
            }}
          >
            {/* Direct HLS Stream Card (Default Engine) */}
            <button
              onClick={() => {
                setPlayerMode("direct");
                setShowOpsMenu(false);
              }}
              style={{
                gridColumn: "1 / -1",
                background:
                  playerMode === "direct"
                    ? "rgba(142, 207, 142, 0.2)"
                    : "rgba(10, 22, 10, 0.8)",
                border: `1px solid ${playerMode === "direct" ? "#8ecf8e" : "rgba(142, 207, 142, 0.45)"}`,
                padding: "14px 18px",
                cursor: "pointer",
                textAlign: "left",
                fontFamily: "inherit",
                transition: "all 0.15s ease",
                boxShadow:
                  playerMode === "direct" ? "0 0 18px rgba(142, 207, 142, 0.2)" : "none",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: 6,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <Sparkles size={15} color="#8ecf8e" />
                  <span style={{ fontSize: 13, fontWeight: 700, color: "#8ecf8e" }}>
                    ★ DIRECT STREAM — NANO HLS ENGINE (DEFAULT)
                  </span>
                  <span
                    style={{
                      fontSize: 9,
                      background: "rgba(142,207,142,0.15)",
                      border: "1px solid #8ecf8e",
                      color: "#8ecf8e",
                      padding: "1px 6px",
                      fontWeight: 700,
                    }}
                  >
                    NATIVE HLS
                  </span>
                </div>
                <span
                  style={{
                    fontSize: 9,
                    padding: "2px 8px",
                    border: "1px solid rgba(16, 185, 129, 0.4)",
                    background: "rgba(16, 185, 129, 0.15)",
                    color: "#10b981",
                    fontWeight: 700,
                  }}
                >
                  {directStream?.provider
                    ? `${directStream.provider.toUpperCase()} // READY`
                    : isLoadingDirect
                    ? "RESOLVING..."
                    : "OPTIMAL"}
                </span>
              </div>
              <div
                style={{
                  fontSize: 10,
                  color: "rgba(142,207,142,0.7)",
                  lineHeight: 1.4,
                  marginBottom: 6,
                }}
              >
                CORS-proxied M3U8 stream with custom player controls, quality switching, and synchronized WebVTT subtitles.
              </div>
              <div
                style={{
                  fontSize: 9,
                  color: playerMode === "direct" ? "#8ecf8e" : "rgba(142,207,142,0.45)",
                  letterSpacing: "0.06em",
                  fontWeight: 700,
                }}
              >
                {playerMode === "direct" ? "▶ CURRENT ROUTE (ACTIVE DIRECT ENGINE)" : "CLICK TO ACTIVATE DIRECT PLAY"}
              </div>
              {directError && (
                <div style={{ marginTop: 6, fontSize: 9, color: "#fda4af" }}>
                  NOTE: {directError}
                </div>
              )}
            </button>

            {/* Embed Providers */}
            {streams.map((st, idx) => {
              const badge = getHealthBadge(st.health);
              const isSelected = playerMode === "embed" && idx === currentIndex;

              return (
                <button
                  key={st.slug}
                  onClick={() => {
                    setCurrentIndex(idx);
                    setPlayerMode("embed");
                    setShowOpsMenu(false);
                  }}
                  style={{
                    background: isSelected
                      ? "rgba(142, 207, 142, 0.18)"
                      : "rgba(10, 18, 10, 0.75)",
                    border: `1px solid ${isSelected ? "#8ecf8e" : "rgba(142, 207, 142, 0.2)"}`,
                    padding: "12px 14px",
                    cursor: "pointer",
                    textAlign: "left",
                    fontFamily: "inherit",
                    transition: "all 0.15s ease",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      marginBottom: 6,
                    }}
                  >
                    <span
                      style={{
                        fontSize: 12,
                        fontWeight: 700,
                        color: isSelected ? "#8ecf8e" : "rgba(142, 207, 142, 0.8)",
                      }}
                    >
                      {st.provider}
                    </span>
                    <span
                      style={{
                        fontSize: 9,
                        padding: "2px 6px",
                        border: `1px solid ${badge.border}`,
                        background: badge.bg,
                        color: badge.color,
                        fontWeight: 700,
                      }}
                    >
                      {st.health}% {badge.status}
                    </span>
                  </div>
                  <div style={{ fontSize: 9, color: "rgba(142,207,142,0.4)", letterSpacing: "0.06em" }}>
                    {isSelected ? "▶ CURRENT ROUTE (ACTIVE EMBED)" : "CLICK TO SWITCH TO THIS EMBED"}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Canary Failure Reporting */}
          <div
            style={{
              marginTop: 10,
              padding: "12px 16px",
              background: "rgba(10, 18, 10, 0.8)",
              border: "1px solid rgba(142, 207, 142, 0.15)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: 10,
            }}
          >
            <div>
              <div style={{ fontSize: 10, color: "#8ecf8e", fontWeight: 700, marginBottom: 2 }}>
                CANARY FAILOVER TELEMETRY
              </div>
              <div style={{ fontSize: 9, color: "rgba(142,207,142,0.4)" }}>
                Having stream lag or a black screen? Trigger canary failover to route to the next healthiest server.
              </div>
            </div>

            <button
              onClick={() => reportFailure("manual_report")}
              disabled={isReporting}
              style={{
                background: "rgba(244, 63, 94, 0.12)",
                border: "1px solid rgba(244, 63, 94, 0.4)",
                color: "#fda4af",
                fontFamily: "inherit",
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: "0.1em",
                padding: "7px 14px",
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              {isReporting ? (
                <RefreshCw size={12} className="animate-spin" />
              ) : reportSuccess ? (
                <>
                  <CheckCircle2 size={12} /> FAILOVER_RECORDED
                </>
              ) : (
                <>
                  <AlertTriangle size={12} /> REPORT BROKEN // TRIGGER FAILOVER
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Tab 3 Body: Record Details (Quick-View) */}
      {activeOpsTab === "details" && (
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 16 }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "140px 1fr",
              gap: 20,
              alignItems: "flex-start",
            }}
            className="ops-details-wrap"
          >
            {/* Poster preview */}
            <div>
              {posterPath ? (
                <div
                  style={{
                    position: "relative",
                    border: "1px solid rgba(142, 207, 142, 0.3)",
                    overflow: "hidden",
                  }}
                >
                  <img
                    src={posterPath}
                    alt={title}
                    style={{ width: "100%", display: "block" }}
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
              ) : null}
            </div>

            {/* Metadata Spec Sheet */}
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <div>
                <h2
                  className="glow-text"
                  style={{
                    fontSize: 18,
                    color: "#8ecf8e",
                    fontWeight: 700,
                    marginBottom: 4,
                  }}
                >
                  {title}
                  {mediaDetail?.releaseDate && (
                    <span
                      style={{
                        fontSize: 12,
                        fontWeight: 400,
                        color: "rgba(142, 207, 142, 0.4)",
                        marginLeft: 8,
                      }}
                    >
                      ({mediaDetail.releaseDate.substring(0, 4)})
                    </span>
                  )}
                </h2>
                {mediaDetail?.tagline && (
                  <div
                    style={{
                      fontSize: 10,
                      color: "rgba(142,207,142,0.4)",
                      fontStyle: "italic",
                    }}
                  >
                    {"// "}&ldquo;{mediaDetail.tagline}&rdquo;
                  </div>
                )}
              </div>

              {/* Spec telemetry pills */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(110px, 1fr))",
                  gap: 8,
                  padding: "8px 12px",
                  background: "rgba(8, 14, 8, 0.8)",
                  border: "1px solid rgba(142, 207, 142, 0.15)",
                  fontSize: 9,
                }}
              >
                <div>
                  <div style={{ color: "rgba(142, 207, 142, 0.35)", marginBottom: 2 }}>
                    RATING
                  </div>
                  <div style={{ fontWeight: 700, color: "#8ecf8e" }}>
                    {mediaDetail?.voteAverage ? `${mediaDetail.voteAverage.toFixed(1)} / 10` : "N/A"}
                  </div>
                </div>
                <div>
                  <div style={{ color: "rgba(142, 207, 142, 0.35)", marginBottom: 2 }}>
                    {mediaType === "tv" ? "TOTAL EPISODES" : "RUNTIME"}
                  </div>
                  <div style={{ color: "#8ecf8e" }}>
                    {mediaType === "tv"
                      ? `${mediaDetail?.numberOfEpisodes || episodes.length} EPS`
                      : `${mediaDetail?.runtime || 0} MIN`}
                  </div>
                </div>
                <div>
                  <div style={{ color: "rgba(142, 207, 142, 0.35)", marginBottom: 2 }}>
                    STATUS
                  </div>
                  <div style={{ color: "#8ecf8e" }}>
                    {(mediaDetail?.status || "AVAILABLE").toUpperCase()}
                  </div>
                </div>
              </div>

              {/* Genres */}
              {mediaDetail?.genres && mediaDetail.genres.length > 0 && (
                <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                  {mediaDetail.genres.map((g) => (
                    <span key={g.id} className="tag">
                      {g.name.toUpperCase()}
                    </span>
                  ))}
                </div>
              )}

              {/* Synopsis */}
              <div>
                <div
                  style={{
                    fontSize: 9,
                    letterSpacing: "0.12em",
                    color: "rgba(142,207,142,0.4)",
                    marginBottom: 4,
                  }}
                >
                  SYNOPSIS // RECORD LOG:
                </div>
                <p
                  style={{
                    fontSize: 10,
                    lineHeight: 1.6,
                    color: "rgba(142,207,142,0.75)",
                    maxHeight: 120,
                    overflowY: "auto",
                  }}
                >
                  {mediaDetail?.overview || "No overview recorded for this title."}
                </p>
              </div>

              {/* Watchlist & Action Controls */}
              <div style={{ display: "flex", gap: 8, marginTop: 4, flexWrap: "wrap" }}>
                <button
                  onClick={() =>
                    toggleQueue({
                      tmdbId,
                      mediaType,
                      title,
                      posterPath,
                      backdropPath,
                    })
                  }
                  style={{
                    background: queued ? "rgba(142, 207, 142, 0.2)" : "transparent",
                    border: `1px solid ${queued ? "#8ecf8e" : "rgba(142, 207, 142, 0.3)"}`,
                    color: queued ? "#8ecf8e" : "rgba(142, 207, 142, 0.6)",
                    fontFamily: "inherit",
                    fontSize: 10,
                    padding: "6px 14px",
                    cursor: "pointer",
                  }}
                >
                  {queued ? "QUEUED IN WATCHLIST" : "+ ADD TO WATCHLIST"}
                </button>

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
                    } catch {}
                  }}
                  style={{
                    background: "transparent",
                    border: "1px solid rgba(142, 207, 142, 0.3)",
                    color: "rgba(142, 207, 142, 0.7)",
                    fontFamily: "inherit",
                    fontSize: 10,
                    padding: "6px 14px",
                    cursor: "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 4,
                  }}
                >
                  <CheckCircle2 size={11} color="#10b981" />
                  <span>MARK_DONE</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  // CASE 1: DIRECT PLAY MODE (DEFAULT)
  if (playerMode === "direct") {
    // 1A. Direct Stream is Loading
    if (isLoadingDirect) {
      return (
        <div
          ref={playerContainerRef}
          className="focused-player-root entry-animate"
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 2000,
            width: "100vw",
            height: "100vh",
            background: "#060608",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            fontFamily: "'JetBrains Mono', 'Share Tech Mono', monospace",
            padding: 24,
            textAlign: "center",
          }}
        >
          {/* Scanline overlay */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              background:
                "repeating-linear-gradient(to bottom, transparent 0px, transparent 2px, rgba(0,0,0,0.2) 2px, rgba(0,0,0,0.2) 3px)",
              pointerEvents: "none",
            }}
          />
          <div
            style={{
              maxWidth: 520,
              background: "rgba(10, 18, 10, 0.95)",
              border: "1px solid #8ecf8e",
              padding: "28px 34px",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 14,
              boxShadow: "0 0 30px rgba(142, 207, 142, 0.15)",
            }}
          >
            <RefreshCw size={32} className="animate-spin" color="#8ecf8e" />
            <div
              style={{
                fontSize: 13,
                fontWeight: 700,
                color: "#8ecf8e",
                letterSpacing: "0.14em",
              }}
            >
              INITIALIZING DIRECT HLS PIPELINE...
            </div>
            <div
              style={{
                fontSize: 10,
                color: "rgba(142, 207, 142, 0.65)",
                lineHeight: 1.6,
              }}
            >
              &gt;&gt; Multi-source cryptographic token resolution active via Nano Streaming API...
            </div>
            <div style={{ display: "flex", gap: 10, marginTop: 10 }}>
              <button
                onClick={() => setPlayerMode("embed")}
                style={{
                  background: "rgba(142, 207, 142, 0.12)",
                  border: "1px solid rgba(142, 207, 142, 0.4)",
                  color: "#8ecf8e",
                  fontFamily: "inherit",
                  fontSize: 10,
                  fontWeight: 700,
                  letterSpacing: "0.08em",
                  padding: "6px 14px",
                  cursor: "pointer",
                }}
              >
                SKIP TO EMBED IFRAME
              </button>
              <button
                onClick={() => onClose?.()}
                style={{
                  background: "transparent",
                  border: "1px solid rgba(244, 63, 94, 0.3)",
                  color: "#fda4af",
                  fontFamily: "inherit",
                  fontSize: 10,
                  padding: "6px 14px",
                  cursor: "pointer",
                }}
              >
                DISCONNECT
              </button>
            </div>
          </div>
        </div>
      );
    }

    // 1B. Direct Stream is Ready
    if (directStream && directStream.streamUrl) {
      return (
        <>
          <CustomVideoPlayer
            streamData={directStream}
            mediaType={mediaType}
            tmdbId={tmdbId}
            season={season}
            episode={episode}
            title={title}
            posterPath={posterPath}
            backdropPath={backdropPath}
            initialProgressSeconds={initialProgressSeconds}
            onFallbackToEmbed={() => setPlayerMode("embed")}
            onOpenOpsMenu={() => setShowOpsMenu(true)}
            onClosePlayer={() => onClose?.()}
            selectedSeason={selectedSeason}
            selectedEpisode={selectedEpisode}
            currentEpisodeName={currentEpisodeObj?.name}
          />
          {showOpsMenu && renderOpsMenuModal()}
        </>
      );
    }
  }

  // CASE 2: FALLBACK EMBED IFRAME PLAYER
  return (
    <div
      ref={playerContainerRef}
      className="focused-player-root entry-animate"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 2000,
        width: "100vw",
        height: "100vh",
        background: "#000",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        fontFamily: "'JetBrains Mono', 'Share Tech Mono', monospace",
      }}
    >
      {/* Top Retro HUD Bar */}
      <div
        style={{
          height: 44,
          minHeight: 44,
          background: "rgba(8, 14, 8, 0.98)",
          borderBottom: "1px solid rgba(142, 207, 142, 0.28)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 16px",
          zIndex: 40,
          userSelect: "none",
        }}
      >
        {/* Left Telemetry */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
          <span
            style={{
              width: 7,
              height: 7,
              borderRadius: "50%",
              background: "#8ecf8e",
              display: "inline-block",
              boxShadow: "0 0 8px #8ecf8e",
              flexShrink: 0,
            }}
          />
          <span style={{ color: "#8ecf8e", fontWeight: 700, fontSize: 11, letterSpacing: "0.12em" }}>
            EMBED MONITOR
          </span>
          <span style={{ color: "rgba(142, 207, 142, 0.3)" }}>{"//"}</span>
          <span
            style={{
              color: "rgba(142, 207, 142, 0.85)",
              fontSize: 11,
              letterSpacing: "0.08em",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {mediaType === "tv"
              ? `FEED S${String(selectedSeason).padStart(2, "0")}E${String(selectedEpisode).padStart(2, "0")}${currentEpisodeObj?.name ? ` · "${currentEpisodeObj.name}"` : ""}`
              : `${title} // FALLBACK EMBED`}
          </span>
        </div>

        {/* Right HUD Controls */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
          {/* Button to Switch Back to Direct Play */}
          <button
            onClick={() => {
              if (directStream?.streamUrl) {
                setPlayerMode("direct");
              } else {
                setIsLoadingDirect(true);
                fetch(
                  `/api/streams/direct?tmdb_id=${tmdbId}&type=${mediaType}${
                    mediaType === "tv"
                      ? `&season=${selectedSeason}&episode=${selectedEpisode}`
                      : ""
                  }&refresh=true`
                )
                  .then((r) => r.json())
                  .then((d) => {
                    if (d?.ok && d.data?.streamUrl) {
                      setDirectStream(d.data);
                      setPlayerMode("direct");
                    }
                  })
                  .finally(() => setIsLoadingDirect(false));
              }
            }}
            style={{
              background: "rgba(142, 207, 142, 0.12)",
              border: "1px solid #8ecf8e",
              color: "#8ecf8e",
              fontFamily: "inherit",
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: "0.08em",
              padding: "5px 12px",
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: 5,
              transition: "all 0.15s ease",
            }}
            title="Switch to Native Direct Play"
          >
            <Sparkles size={11} />
            <span>SWITCH TO DIRECT PLAY</span>
          </button>

          {/* Custom In-Player Menu Overlay Toggle */}
          <button
            onClick={() => setShowOpsMenu(!showOpsMenu)}
            style={{
              background: showOpsMenu ? "rgba(142, 207, 142, 0.25)" : "rgba(142, 207, 142, 0.1)",
              border: `1px solid ${showOpsMenu ? "#8ecf8e" : "rgba(142, 207, 142, 0.4)"}`,
              color: "#8ecf8e",
              fontFamily: "inherit",
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: "0.12em",
              padding: "5px 12px",
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              textShadow: "0 0 8px rgba(142, 207, 142, 0.6)",
              transition: "all 0.15s ease",
            }}
            title="Open In-Player Ops Menu (Press M)"
          >
            <span style={{ fontSize: 12 }}>☰</span>
            <span>{showOpsMenu ? "CLOSE MENU" : "OPS MENU"}</span>
          </button>

          {/* Fullscreen Toggle */}
          <button
            onClick={toggleNativeFullscreen}
            style={{
              background: "transparent",
              border: "1px solid rgba(142, 207, 142, 0.25)",
              color: "rgba(142, 207, 142, 0.6)",
              fontFamily: "inherit",
              fontSize: 10,
              padding: "5px 10px",
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: 5,
              transition: "all 0.15s ease",
            }}
            title="Toggle Native Browser Fullscreen"
          >
            <Maximize2 size={11} />
            <span className="hidden-mobile">FULLSCREEN</span>
          </button>

          {/* Disconnect Feed (Close Player) */}
          <button
            onClick={() => {
              if (onClose) onClose();
            }}
            style={{
              background: "rgba(244, 63, 94, 0.08)",
              border: "1px solid rgba(244, 63, 94, 0.35)",
              color: "#fda4af",
              fontFamily: "inherit",
              fontSize: 10,
              letterSpacing: "0.08em",
              padding: "5px 10px",
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
              transition: "all 0.15s ease",
            }}
            title="Disconnect Stream Feed and return (Escape)"
          >
            <X size={11} />
            <span>DISCONNECT</span>
          </button>
        </div>
      </div>

      {/* Main Video Canvas Viewport */}
      <div
        style={{
          flex: 1,
          position: "relative",
          width: "100%",
          height: "100%",
          background: "#000",
          overflow: "hidden",
        }}
      >
        {renderIframe()}

        {/* In-Player Menu Overlay Modal */}
        {showOpsMenu && renderOpsMenuModal()}
      </div>

      {/* Bottom Minimal HUD Bar */}
      <div
        style={{
          height: 38,
          minHeight: 38,
          background: "rgba(8, 14, 8, 0.96)",
          borderTop: "1px solid rgba(142, 207, 142, 0.2)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 16px",
          zIndex: 40,
          userSelect: "none",
        }}
      >
        {/* Active Route Pill & Quick Switcher */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, overflowX: "auto" }}>
          <span style={{ fontSize: 9, color: "rgba(142,207,142,0.35)", letterSpacing: "0.1em" }}>
            ROUTE:
          </span>

          {/* Direct stream button */}
          <button
            onClick={() => setPlayerMode("direct")}
            style={{
              background: "rgba(142, 207, 142, 0.1)",
              border: "1px solid rgba(142, 207, 142, 0.3)",
              color: "#8ecf8e",
              fontFamily: "inherit",
              fontSize: 9,
              padding: "2px 8px",
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: 5,
            }}
          >
            <Sparkles size={9} />
            <span>★ DIRECT HLS</span>
          </button>

          {streams.slice(0, 4).map((st, idx) => {
            const badge = getHealthBadge(st.health);
            const isSelected = playerMode === "embed" && idx === currentIndex;
            return (
              <button
                key={st.slug}
                onClick={() => {
                  setCurrentIndex(idx);
                  setPlayerMode("embed");
                }}
                style={{
                  background: isSelected ? "rgba(142, 207, 142, 0.2)" : "transparent",
                  border: `1px solid ${isSelected ? "#8ecf8e" : "rgba(142, 207, 142, 0.2)"}`,
                  color: isSelected ? "#8ecf8e" : "rgba(142, 207, 142, 0.5)",
                  fontFamily: "inherit",
                  fontSize: 9,
                  padding: "2px 8px",
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 5,
                }}
              >
                <span
                  style={{
                    width: 5,
                    height: 5,
                    borderRadius: "50%",
                    background: badge.color,
                  }}
                />
                <span>{st.provider}</span>
              </button>
            );
          })}
        </div>

        {/* Status indicator & Ops menu trigger */}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {activeStream && (
            <span
              style={{
                fontSize: 9,
                color: getHealthBadge(activeStream.health).color,
                letterSpacing: "0.08em",
              }}
              className="hidden-mobile"
            >
              ● {activeStream.health}% HEALTH // {getHealthBadge(activeStream.health).status}
            </span>
          )}

          <button
            onClick={() => setShowOpsMenu(!showOpsMenu)}
            style={{
              background: "transparent",
              border: "1px solid rgba(142, 207, 142, 0.3)",
              color: "#8ecf8e",
              fontFamily: "inherit",
              fontSize: 9,
              padding: "3px 8px",
              cursor: "pointer",
              letterSpacing: "0.08em",
            }}
          >
            [ ☰ MENU ]
          </button>
        </div>
      </div>

      <style jsx>{`
        @media (max-width: 600px) {
          .hidden-mobile {
            display: none !important;
          }
          .ops-details-wrap {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}
