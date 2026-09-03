"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import Hls from "hls.js";
import {
  Play,
  Pause,
  RotateCcw,
  RotateCw,
  Volume2,
  Volume1,
  VolumeX,
  Maximize2,
  Minimize2,
  Subtitles,
  PictureInPicture,
  AlertTriangle,
  RefreshCw,
  Check,
  Server,
  Layers,
} from "lucide-react";
import { MediaType } from "@/types";
import { DirectStreamResult } from "@/lib/nano-api";

interface CustomVideoPlayerProps {
  streamData: DirectStreamResult;
  mediaType: MediaType;
  tmdbId: number;
  season?: number;
  episode?: number;
  title: string;
  posterPath?: string | null;
  backdropPath?: string | null;
  initialProgressSeconds?: number;
  onFallbackToEmbed: () => void;
  onOpenOpsMenu: () => void;
  onClosePlayer: () => void;
  selectedSeason?: number;
  selectedEpisode?: number;
  currentEpisodeName?: string;
}

export default function CustomVideoPlayer({
  streamData,
  mediaType,
  tmdbId,
  season,
  episode,
  title,
  posterPath,
  backdropPath,
  initialProgressSeconds = 0,
  onFallbackToEmbed,
  onOpenOpsMenu,
  onClosePlayer,
  selectedSeason = season || 1,
  selectedEpisode = episode || 1,
  currentEpisodeName,
}: CustomVideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const hlsRef = useRef<Hls | null>(null);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const scrubBarRef = useRef<HTMLDivElement | null>(null);

  // Playback state
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [bufferedPercent, setBufferedPercent] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isBuffering, setIsBuffering] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [playbackRate, setPlaybackRate] = useState(1);

  // Scrubber hover state
  const [hoverPosition, setHoverPosition] = useState<number | null>(null);
  const [hoverTime, setHoverTime] = useState<number | null>(null);
  const [isScrubbing, setIsScrubbing] = useState(false);

  // Subtitles & Quality menus
  const [showSubtitleMenu, setShowSubtitleMenu] = useState(false);
  const [showQualityMenu, setShowQualityMenu] = useState(false);
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);
  const [availableQualities, setAvailableQualities] = useState<
    { index: number; label: string; height: number; bitrate: number }[]
  >([]);
  const [currentQualityIndex, setCurrentQualityIndex] = useState<number>(-1); // -1 is Auto
  const [activeSubtitleUrl, setActiveSubtitleUrl] = useState<string>("off");

  // Error & Recovery state
  const [streamError, setStreamError] = useState<string | null>(null);
  const [autoFallbackCountdown, setAutoFallbackCountdown] = useState<number | null>(null);

  // Keyboard shortcut feedback ripple
  const [flashAction, setFlashAction] = useState<string | null>(null);
  const flashTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const triggerFlash = (label: string) => {
    if (flashTimeoutRef.current) clearTimeout(flashTimeoutRef.current);
    setFlashAction(label);
    flashTimeoutRef.current = setTimeout(() => setFlashAction(null), 800);
  };

  const handleFatalError = useCallback((msg: string) => {
    setStreamError(msg);
    setAutoFallbackCountdown(5);
  }, []);

  // Format seconds to mm:ss or hh:mm:ss
  const formatTime = (seconds: number) => {
    if (!seconds || isNaN(seconds)) return "00:00";
    const totalSecs = Math.floor(seconds);
    const hrs = Math.floor(totalSecs / 3600);
    const mins = Math.floor((totalSecs % 3600) / 60);
    const secs = totalSecs % 60;

    const pad = (n: number) => String(n).padStart(2, "0");
    if (hrs > 0) {
      return `${hrs}:${pad(mins)}:${pad(secs)}`;
    }
    return `${pad(mins)}:${pad(secs)}`;
  };

  // Autohide controls handler
  const resetControlsTimer = useCallback(() => {
    setShowControls(true);
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    controlsTimeoutRef.current = setTimeout(() => {
      if (isPlaying && !showSubtitleMenu && !showQualityMenu && !showSpeedMenu && !isScrubbing) {
        setShowControls(false);
      }
    }, 3200);
  }, [isPlaying, showSubtitleMenu, showQualityMenu, showSpeedMenu, isScrubbing]);

  // Subtitle Selection
  const handleSelectSubtitle = useCallback(
    (url: string) => {
      const video = videoRef.current;
      setActiveSubtitleUrl(url);
      setShowSubtitleMenu(false);

      if (!video) return;

      // Toggle track visibility in video.textTracks
      for (let i = 0; i < video.textTracks.length; i++) {
        const track = video.textTracks[i];
        if (url === "off") {
          track.mode = "hidden";
        } else {
          // Match label
          const selectedSub = streamData.subtitles?.find((s) => s.url === url);
          if (selectedSub && track.label === selectedSub.label) {
            track.mode = "showing";
          } else {
            track.mode = "hidden";
          }
        }
      }
    },
    [streamData.subtitles]
  );

  // Toggle Next Subtitle shortcut (C)
  const toggleNextSubtitle = useCallback(() => {
    const subs = streamData.subtitles || [];
    if (subs.length === 0) {
      triggerFlash("NO SUBTITLES");
      return;
    }

    if (activeSubtitleUrl === "off") {
      const enSub = subs.find((s) => s.language?.toLowerCase().includes("en")) || subs[0];
      handleSelectSubtitle(enSub.url);
      triggerFlash(`SUB: ${enSub.label}`);
    } else {
      handleSelectSubtitle("off");
      triggerFlash("SUB: OFF");
    }
  }, [streamData.subtitles, activeSubtitleUrl, handleSelectSubtitle]);

  // Fullscreen
  const toggleFullscreen = useCallback(async () => {
    const container = containerRef.current;
    if (!container) return;

    try {
      if (!document.fullscreenElement) {
        if (container.requestFullscreen) {
          await container.requestFullscreen();
        }
      } else {
        if (document.exitFullscreen) {
          await document.exitFullscreen();
        }
      }
    } catch (err) {
      console.error("Fullscreen toggle failed:", err);
    }
  }, []);

  // HLS Engine Lifecycle
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !streamData.streamUrl) return;

    let hlsInstance: Hls | null = null;

    if (Hls.isSupported()) {
      hlsInstance = new Hls({
        enableWorker: true,
        lowLatencyMode: false,
        backBufferLength: 90,
        maxBufferLength: 60,
        maxMaxBufferLength: 120,
      });

      hlsRef.current = hlsInstance;
      hlsInstance.loadSource(streamData.streamUrl);
      hlsInstance.attachMedia(video);

      hlsInstance.on(Hls.Events.MANIFEST_PARSED, (_, data) => {
        setIsBuffering(false);
        const qualities = data.levels.map((lvl, index) => ({
          index,
          label: lvl.height ? `${lvl.height}p` : `Level ${index + 1}`,
          height: lvl.height || 0,
          bitrate: lvl.bitrate || 0,
        }));
        setAvailableQualities(qualities);

        // Resume playback at initial progress if requested
        if (initialProgressSeconds > 5) {
          video.currentTime = initialProgressSeconds;
        }

        // Try autoplay
        video.play().catch(() => {
          setIsPlaying(false);
        });
      });

      hlsInstance.on(Hls.Events.LEVEL_SWITCHED, (_, data) => {
        setCurrentQualityIndex(hlsInstance?.autoLevelEnabled ? -1 : data.level);
      });

      hlsInstance.on(Hls.Events.ERROR, (_, data) => {
        console.warn("[HLS Stream Warning]:", data.type, data.details);
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              console.log("[HLS] Attempting to recover from network error...");
              hlsInstance?.startLoad();
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              console.log("[HLS] Attempting to recover from media error...");
              hlsInstance?.recoverMediaError();
              break;
            default:
              console.error("[HLS Fatal Error]:", data.details);
              handleFatalError(`HLS stream playback failed: ${data.details}`);
              hlsInstance?.destroy();
              break;
          }
        }
      });
    } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
      // Native Safari HLS
      video.src = streamData.streamUrl;
      video.addEventListener("loadedmetadata", () => {
        setIsBuffering(false);
        if (initialProgressSeconds > 5) {
          video.currentTime = initialProgressSeconds;
        }
        video.play().catch(() => setIsPlaying(false));
      });
    } else {
      handleFatalError("HLS streaming is not supported by your browser environment.");
    }

    return () => {
      if (hlsInstance) {
        hlsInstance.destroy();
        hlsRef.current = null;
      }
    };
  }, [streamData.streamUrl, initialProgressSeconds, handleFatalError]);

  // Video element events
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    const onWaiting = () => setIsBuffering(true);
    const onPlaying = () => setIsBuffering(false);
    const onTimeUpdate = () => {
      if (!isScrubbing) {
        setCurrentTime(video.currentTime);
      }
      if (video.buffered.length > 0 && video.duration) {
        const bufferedEnd = video.buffered.end(video.buffered.length - 1);
        setBufferedPercent((bufferedEnd / video.duration) * 100);
      }
    };
    const onDurationChange = () => setDuration(video.duration || 0);
    const onError = () => {
      handleFatalError("Direct video element encountered a decoding error.");
    };

    video.addEventListener("play", onPlay);
    video.addEventListener("pause", onPause);
    video.addEventListener("waiting", onWaiting);
    video.addEventListener("playing", onPlaying);
    video.addEventListener("timeupdate", onTimeUpdate);
    video.addEventListener("durationchange", onDurationChange);
    video.addEventListener("error", onError);

    return () => {
      video.removeEventListener("play", onPlay);
      video.removeEventListener("pause", onPause);
      video.removeEventListener("waiting", onWaiting);
      video.removeEventListener("playing", onPlaying);
      video.removeEventListener("timeupdate", onTimeUpdate);
      video.removeEventListener("durationchange", onDurationChange);
      video.removeEventListener("error", onError);
    };
  }, [isScrubbing, handleFatalError]);

  // Auto-fallback countdown timer
  useEffect(() => {
    if (autoFallbackCountdown === null) return;
    if (autoFallbackCountdown <= 0) {
      onFallbackToEmbed();
      return;
    }
    const timer = setTimeout(() => {
      setAutoFallbackCountdown((prev) => (prev !== null ? prev - 1 : null));
    }, 1000);
    return () => clearTimeout(timer);
  }, [autoFallbackCountdown, onFallbackToEmbed]);

  // Activity Sync to /api/activities
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const syncProgress = () => {
      const currentSecs = Math.floor(video.currentTime);
      const totalSecs = Math.floor(video.duration || (mediaType === "tv" ? 1500 : 5400));
      if (currentSecs <= 0) return;

      const halfMark = totalSecs * 0.5;
      const completedMark = totalSecs * 0.95;

      let autoStatus: string | undefined = undefined;
      if (currentSecs >= completedMark) {
        autoStatus = "completed";
      } else if (currentSecs >= halfMark) {
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
            timestampSeconds: currentSecs,
            durationSeconds: totalSecs,
            lastSeason: season || selectedSeason || null,
            lastEpisode: episode || selectedEpisode || null,
          },
        }),
      }).catch(() => {});
    };

    // Sync every 25 seconds
    const interval = setInterval(syncProgress, 25000);
    return () => {
      clearInterval(interval);
      syncProgress();
    };
  }, [mediaType, tmdbId, season, episode, selectedSeason, selectedEpisode, title, posterPath, backdropPath]);

  // Fullscreen change listener
  useEffect(() => {
    const onFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", onFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", onFullscreenChange);
  }, []);

  // Keyboard Shortcuts Listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      resetControlsTimer();
      const video = videoRef.current;
      if (!video) return;

      switch (e.key.toLowerCase()) {
        case " ":
        case "k":
          e.preventDefault();
          if (video.paused) {
            video.play();
            triggerFlash("PLAY");
          } else {
            video.pause();
            triggerFlash("PAUSE");
          }
          break;

        case "arrowleft":
        case "j":
          e.preventDefault();
          video.currentTime = Math.max(0, video.currentTime - 10);
          triggerFlash("-10s");
          break;

        case "arrowright":
        case "l":
          e.preventDefault();
          video.currentTime = Math.min(video.duration || Infinity, video.currentTime + 10);
          triggerFlash("+10s");
          break;

        case "arrowup":
          e.preventDefault();
          {
            const newVol = Math.min(1, video.volume + 0.1);
            video.volume = newVol;
            setVolume(newVol);
            setIsMuted(false);
            triggerFlash(`VOL ${Math.round(newVol * 100)}%`);
          }
          break;

        case "arrowdown":
          e.preventDefault();
          {
            const newVol = Math.max(0, video.volume - 0.1);
            video.volume = newVol;
            setVolume(newVol);
            setIsMuted(newVol === 0);
            triggerFlash(`VOL ${Math.round(newVol * 100)}%`);
          }
          break;

        case "m":
          e.preventDefault();
          video.muted = !video.muted;
          setIsMuted(video.muted);
          triggerFlash(video.muted ? "MUTED" : "UNMUTED");
          break;

        case "f":
          e.preventDefault();
          toggleFullscreen();
          break;

        case "c":
          e.preventDefault();
          toggleNextSubtitle();
          break;

        case "escape":
          e.preventDefault();
          if (showSubtitleMenu || showQualityMenu || showSpeedMenu) {
            setShowSubtitleMenu(false);
            setShowQualityMenu(false);
            setShowSpeedMenu(false);
          } else {
            onClosePlayer();
          }
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    showSubtitleMenu,
    showQualityMenu,
    showSpeedMenu,
    onClosePlayer,
    resetControlsTimer,
    toggleFullscreen,
    toggleNextSubtitle,
  ]);

  // Play / Pause Toggle
  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      video.play();
    } else {
      video.pause();
    }
  };

  // Rewind / Forward
  const seekRelative = (seconds: number) => {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = Math.max(0, Math.min(video.duration || Infinity, video.currentTime + seconds));
    triggerFlash(seconds > 0 ? `+${seconds}s` : `${seconds}s`);
  };

  // Volume slider
  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVol = parseFloat(e.target.value);
    const video = videoRef.current;
    if (video) {
      video.volume = newVol;
      video.muted = newVol === 0;
    }
    setVolume(newVol);
    setIsMuted(newVol === 0);
  };

  const toggleMute = () => {
    const video = videoRef.current;
    if (!video) return;
    const newMuted = !video.muted;
    video.muted = newMuted;
    setIsMuted(newMuted);
  };

  // Picture-in-Picture
  const togglePiP = async () => {
    const video = videoRef.current;
    if (!video) return;
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
      } else if (video.requestPictureInPicture) {
        await video.requestPictureInPicture();
      }
    } catch (err) {
      console.error("Picture-in-Picture error:", err);
    }
  };

  // Scrub bar interactions
  const handleScrubMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const scrubBar = scrubBarRef.current;
    if (!scrubBar || !duration) return;

    const rect = scrubBar.getBoundingClientRect();
    const pos = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    setHoverPosition(pos * 100);
    setHoverTime(pos * duration);

    if (isScrubbing && videoRef.current) {
      const targetTime = pos * duration;
      setCurrentTime(targetTime);
      videoRef.current.currentTime = targetTime;
    }
  };

  const handleScrubStart = (e: React.MouseEvent<HTMLDivElement>) => {
    setIsScrubbing(true);
    handleScrubMove(e);
  };

  const handleScrubEnd = () => {
    setIsScrubbing(false);
  };

  useEffect(() => {
    if (isScrubbing) {
      const onWindowMouseUp = () => setIsScrubbing(false);
      window.addEventListener("mouseup", onWindowMouseUp);
      return () => window.removeEventListener("mouseup", onWindowMouseUp);
    }
  }, [isScrubbing]);

  // Quality Level Selection
  const handleSelectQuality = (index: number) => {
    const hls = hlsRef.current;
    if (hls) {
      if (index === -1) {
        hls.currentLevel = -1; // Auto
      } else {
        hls.currentLevel = index;
      }
      setCurrentQualityIndex(index);
    }
    setShowQualityMenu(false);
  };

  // Playback Rate Selection
  const handleSelectSpeed = (speed: number) => {
    const video = videoRef.current;
    if (video) {
      video.playbackRate = speed;
      setPlaybackRate(speed);
    }
    setShowSpeedMenu(false);
  };

  const currentPercent = duration ? (currentTime / duration) * 100 : 0;
  const activeQualityLabel =
    currentQualityIndex === -1
      ? "AUTO"
      : availableQualities.find((q) => q.index === currentQualityIndex)?.label || "AUTO";

  const activeSubLabel =
    activeSubtitleUrl === "off"
      ? "OFF"
      : streamData.subtitles?.find((s) => s.url === activeSubtitleUrl)?.label || "ON";

  return (
    <div
      ref={containerRef}
      className="custom-video-player-root"
      onMouseMove={resetControlsTimer}
      onTouchStart={resetControlsTimer}
      onClick={() => {
        if (showSubtitleMenu) setShowSubtitleMenu(false);
        if (showQualityMenu) setShowQualityMenu(false);
        if (showSpeedMenu) setShowSpeedMenu(false);
      }}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 2000,
        width: "100vw",
        height: "100vh",
        background: "#060608",
        overflow: "hidden",
        fontFamily: "'JetBrains Mono', 'Share Tech Mono', monospace",
        cursor: showControls ? "default" : "none",
        userSelect: "none",
      }}
    >
      {/* HTML5 Video Element with HLS Source & WebVTT Tracks */}
      <video
        ref={videoRef}
        crossOrigin="anonymous"
        playsInline
        style={{
          width: "100%",
          height: "100%",
          objectFit: "contain",
          background: "#000",
          display: "block",
        }}
        onClick={(e) => {
          e.stopPropagation();
          togglePlay();
        }}
        onDoubleClick={(e) => {
          e.stopPropagation();
          toggleFullscreen();
        }}
      >
        {streamData.subtitles?.map((sub, idx) => (
          <track
            key={`${sub.url}-${idx}`}
            kind="subtitles"
            label={sub.label}
            srcLang={sub.language}
            src={sub.url}
          />
        ))}
      </video>

      {/* Screen CRT Scanline Overlay */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "repeating-linear-gradient(to bottom, transparent 0px, transparent 2px, rgba(0,0,0,0.18) 2px, rgba(0,0,0,0.18) 3px)",
          pointerEvents: "none",
          zIndex: 10,
        }}
      />

      {/* Keyboard Shortcut Flash Feedback */}
      {flashAction && (
        <div
          style={{
            position: "absolute",
            top: "45%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            background: "rgba(6, 12, 6, 0.88)",
            border: "1px solid #8ecf8e",
            color: "#8ecf8e",
            padding: "12px 24px",
            fontSize: 14,
            fontWeight: 700,
            letterSpacing: "0.15em",
            zIndex: 40,
            pointerEvents: "none",
            boxShadow: "0 0 20px rgba(142, 207, 142, 0.3)",
            animation: "pulse 0.3s ease-out",
          }}
        >
          {flashAction}
        </div>
      )}

      {/* Buffering Indicator */}
      {isBuffering && !streamError && (
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 12,
            zIndex: 25,
            pointerEvents: "none",
            background: "rgba(8, 14, 8, 0.85)",
            border: "1px solid rgba(142, 207, 142, 0.3)",
            padding: "16px 24px",
          }}
        >
          <RefreshCw size={26} className="animate-spin" color="#8ecf8e" />
          <span
            style={{
              fontSize: 10,
              color: "#8ecf8e",
              letterSpacing: "0.18em",
              fontWeight: 700,
            }}
          >
            BUFFERING DIRECT HLS FEED...
          </span>
        </div>
      )}

      {/* Unrecoverable Error / Fallback Modal Overlay */}
      {streamError && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            zIndex: 70,
            background: "rgba(6, 10, 6, 0.95)",
            backdropFilter: "blur(10px)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: 24,
            textAlign: "center",
          }}
        >
          <div
            style={{
              maxWidth: 560,
              background: "#0d130d",
              border: "1px solid rgba(244, 63, 94, 0.4)",
              padding: "24px 30px",
              boxShadow: "0 0 30px rgba(244, 63, 94, 0.15)",
            }}
          >
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                color: "#f43f5e",
                fontWeight: 700,
                fontSize: 12,
                letterSpacing: "0.14em",
                marginBottom: 12,
              }}
            >
              <AlertTriangle size={18} />
              <span>DIRECT STREAM ENCOUNTERED AN ISSUE</span>
            </div>

            <div
              style={{
                fontSize: 11,
                color: "rgba(244, 63, 94, 0.8)",
                marginBottom: 16,
                lineHeight: 1.6,
                wordBreak: "break-word",
              }}
            >
              {streamError}
            </div>

            <div
              style={{
                fontSize: 10,
                color: "rgba(142, 207, 142, 0.7)",
                marginBottom: 20,
                letterSpacing: "0.08em",
              }}
            >
              {autoFallbackCountdown !== null ? (
                <span>
                  Switching to fallback embed provider in{" "}
                  <strong style={{ color: "#8ecf8e" }}>{autoFallbackCountdown}s</strong>...
                </span>
              ) : null}
            </div>

            <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
              <button
                onClick={onFallbackToEmbed}
                style={{
                  background: "rgba(142, 207, 142, 0.15)",
                  border: "1px solid #8ecf8e",
                  color: "#8ecf8e",
                  fontFamily: "inherit",
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: "0.1em",
                  padding: "10px 20px",
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <Server size={14} />
                <span>SWITCH TO EMBED PROVIDER NOW</span>
              </button>

              <button
                onClick={onClosePlayer}
                style={{
                  background: "transparent",
                  border: "1px solid rgba(142, 207, 142, 0.25)",
                  color: "rgba(142, 207, 142, 0.6)",
                  fontFamily: "inherit",
                  fontSize: 11,
                  padding: "10px 16px",
                  cursor: "pointer",
                }}
              >
                DISCONNECT
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TOP HUD BAR */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: 48,
          background: "linear-gradient(to bottom, rgba(6, 10, 6, 0.96) 0%, rgba(6, 10, 6, 0.7) 70%, transparent 100%)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 18px",
          zIndex: 30,
          opacity: showControls ? 1 : 0,
          pointerEvents: showControls ? "auto" : "none",
          transition: "opacity 0.25s ease",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Left Telemetry */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
          <span
            style={{
              width: 7,
              height: 7,
              borderRadius: "50%",
              background: "#8ecf8e",
              boxShadow: "0 0 8px #8ecf8e",
              flexShrink: 0,
            }}
          />
          <span
            style={{
              color: "#8ecf8e",
              fontWeight: 700,
              fontSize: 11,
              letterSpacing: "0.12em",
            }}
          >
            DIRECT PLAY
          </span>
          <span style={{ color: "rgba(142, 207, 142, 0.3)" }}>{"//"}</span>
          <span
            style={{
              background: "rgba(142, 207, 142, 0.12)",
              border: "1px solid rgba(142, 207, 142, 0.3)",
              color: "#8ecf8e",
              fontSize: 9,
              fontWeight: 700,
              padding: "1px 6px",
              letterSpacing: "0.08em",
            }}
          >
            {streamData.provider ? streamData.provider.toUpperCase() : "NANO"}
          </span>
          <span
            style={{
              color: "rgba(142, 207, 142, 0.8)",
              fontSize: 11,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
            className="hidden-mobile"
          >
            {mediaType === "tv"
              ? `S${String(selectedSeason).padStart(2, "0")}E${String(selectedEpisode).padStart(2, "0")}${currentEpisodeName ? ` · "${currentEpisodeName}"` : ""}`
              : title}
          </span>
        </div>

        {/* Right Top Actions */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
          {/* Switch to Embeds button */}
          <button
            onClick={onFallbackToEmbed}
            style={{
              background: "rgba(142, 207, 142, 0.08)",
              border: "1px solid rgba(142, 207, 142, 0.3)",
              color: "#8ecf8e",
              fontFamily: "inherit",
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: "0.08em",
              padding: "5px 10px",
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: 5,
              transition: "all 0.15s ease",
            }}
            title="Switch to third-party embed players (fallback)"
          >
            <Server size={11} />
            <span>SWITCH TO EMBED</span>
          </button>

          {/* In-Player Ops Menu Toggle */}
          <button
            onClick={onOpenOpsMenu}
            style={{
              background: "rgba(142, 207, 142, 0.18)",
              border: "1px solid #8ecf8e",
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
              textShadow: "0 0 6px rgba(142, 207, 142, 0.6)",
            }}
            title="Open Ops Menu (Press M)"
          >
            <span>☰ OPS MENU</span>
          </button>

          {/* Disconnect/Close Button */}
          <button
            onClick={onClosePlayer}
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
            }}
            title="Disconnect Stream (Escape)"
          >
            <span>DISCONNECT</span>
          </button>
        </div>
      </div>

      {/* BOTTOM CONTROLS BAR */}
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          background: "linear-gradient(to top, rgba(6, 10, 6, 0.98) 0%, rgba(6, 10, 6, 0.8) 70%, transparent 100%)",
          padding: "16px 20px 14px",
          display: "flex",
          flexDirection: "column",
          gap: 10,
          zIndex: 30,
          opacity: showControls ? 1 : 0,
          pointerEvents: showControls ? "auto" : "none",
          transition: "opacity 0.25s ease",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Scrub Bar / Timeline */}
        <div
          ref={scrubBarRef}
          onMouseMove={handleScrubMove}
          onMouseDown={handleScrubStart}
          onMouseUp={handleScrubEnd}
          onMouseLeave={() => {
            if (!isScrubbing) {
              setHoverPosition(null);
              setHoverTime(null);
            }
          }}
          style={{
            position: "relative",
            width: "100%",
            height: 20,
            display: "flex",
            alignItems: "center",
            cursor: "pointer",
          }}
        >
          {/* Hover Time Tooltip */}
          {hoverPosition !== null && hoverTime !== null && (
            <div
              style={{
                position: "absolute",
                bottom: 24,
                left: `${hoverPosition}%`,
                transform: "translateX(-50%)",
                background: "#0d160d",
                border: "1px solid #8ecf8e",
                color: "#8ecf8e",
                fontSize: 9,
                fontWeight: 700,
                padding: "2px 6px",
                pointerEvents: "none",
                whiteSpace: "nowrap",
                boxShadow: "0 0 8px rgba(142, 207, 142, 0.4)",
              }}
            >
              {formatTime(hoverTime)}
            </div>
          )}

          {/* Track background */}
          <div
            style={{
              position: "relative",
              width: "100%",
              height: 4,
              background: "#27272a",
              overflow: "hidden",
            }}
          >
            {/* Buffered progress */}
            <div
              style={{
                position: "absolute",
                top: 0,
                bottom: 0,
                left: 0,
                width: `${bufferedPercent}%`,
                background: "rgba(142, 207, 142, 0.25)",
              }}
            />

            {/* Played progress */}
            <div
              style={{
                position: "absolute",
                top: 0,
                bottom: 0,
                left: 0,
                width: `${currentPercent}%`,
                background: "#8ecf8e",
                boxShadow: "0 0 8px #8ecf8e",
              }}
            />
          </div>

          {/* Hover indicator hairline */}
          {hoverPosition !== null && (
            <div
              style={{
                position: "absolute",
                top: 3,
                bottom: 3,
                left: `${hoverPosition}%`,
                width: 2,
                background: "rgba(255, 255, 255, 0.7)",
                pointerEvents: "none",
              }}
            />
          )}

          {/* Seeker Thumb */}
          <div
            style={{
              position: "absolute",
              top: "50%",
              left: `${currentPercent}%`,
              transform: "translate(-50%, -50%)",
              width: 10,
              height: 10,
              background: "#8ecf8e",
              boxShadow: "0 0 6px #8ecf8e",
              pointerEvents: "none",
            }}
          />
        </div>

        {/* Controls Row */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 12,
          }}
        >
          {/* Left Controls: Play/Pause, Replay/Skip, Volume, Time */}
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <button
              onClick={togglePlay}
              style={{
                background: "transparent",
                border: "none",
                color: "#8ecf8e",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: 4,
              }}
              title={isPlaying ? "Pause (Space)" : "Play (Space)"}
            >
              {isPlaying ? <Pause size={18} /> : <Play size={18} />}
            </button>

            {/* 10s Rewind */}
            <button
              onClick={() => seekRelative(-10)}
              style={{
                background: "transparent",
                border: "none",
                color: "rgba(142, 207, 142, 0.7)",
                cursor: "pointer",
                padding: 4,
              }}
              title="Rewind 10s (Left Arrow)"
            >
              <RotateCcw size={16} />
            </button>

            {/* 10s Forward */}
            <button
              onClick={() => seekRelative(10)}
              style={{
                background: "transparent",
                border: "none",
                color: "rgba(142, 207, 142, 0.7)",
                cursor: "pointer",
                padding: 4,
              }}
              title="Forward 10s (Right Arrow)"
            >
              <RotateCw size={16} />
            </button>

            {/* Volume Control */}
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <button
                onClick={toggleMute}
                style={{
                  background: "transparent",
                  border: "none",
                  color: isMuted ? "#f43f5e" : "#8ecf8e",
                  cursor: "pointer",
                  padding: 4,
                }}
                title={isMuted ? "Unmute (M)" : "Mute (M)"}
              >
                {isMuted || volume === 0 ? (
                  <VolumeX size={16} />
                ) : volume < 0.5 ? (
                  <Volume1 size={16} />
                ) : (
                  <Volume2 size={16} />
                )}
              </button>

              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={isMuted ? 0 : volume}
                onChange={handleVolumeChange}
                style={{
                  width: 64,
                  height: 3,
                  accentColor: "#8ecf8e",
                  background: "#27272a",
                  cursor: "pointer",
                }}
              />
            </div>

            {/* Timecode */}
            <div
              style={{
                fontSize: 10,
                color: "rgba(142, 207, 142, 0.8)",
                letterSpacing: "0.08em",
              }}
            >
              <span>{formatTime(currentTime)}</span>
              <span style={{ margin: "0 4px", color: "rgba(142,207,142,0.3)" }}>/</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>

          {/* Right Controls: Subtitles, Quality, Speed, PiP, Fullscreen */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, position: "relative" }}>
            {/* Subtitles Menu Trigger */}
            <div style={{ position: "relative" }}>
              <button
                onClick={() => {
                  setShowSubtitleMenu(!showSubtitleMenu);
                  setShowQualityMenu(false);
                  setShowSpeedMenu(false);
                }}
                style={{
                  background:
                    activeSubtitleUrl !== "off"
                      ? "rgba(142, 207, 142, 0.2)"
                      : "transparent",
                  border: `1px solid ${activeSubtitleUrl !== "off" ? "#8ecf8e" : "rgba(142, 207, 142, 0.25)"}`,
                  color: activeSubtitleUrl !== "off" ? "#8ecf8e" : "rgba(142, 207, 142, 0.6)",
                  fontFamily: "inherit",
                  fontSize: 9,
                  fontWeight: 700,
                  padding: "4px 8px",
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 5,
                }}
                title="Captions / Subtitles (Press C)"
              >
                <Subtitles size={12} />
                <span>CC: {activeSubLabel}</span>
              </button>

              {/* Subtitles Popover Menu */}
              {showSubtitleMenu && (
                <div
                  style={{
                    position: "absolute",
                    bottom: 32,
                    right: 0,
                    width: 220,
                    maxHeight: 280,
                    overflowY: "auto",
                    background: "rgba(8, 14, 8, 0.98)",
                    border: "1px solid #8ecf8e",
                    boxShadow: "0 0 16px rgba(0, 0, 0, 0.8)",
                    zIndex: 50,
                    display: "flex",
                    flexDirection: "column",
                  }}
                >
                  <div
                    style={{
                      padding: "8px 10px",
                      fontSize: 9,
                      color: "rgba(142,207,142,0.5)",
                      borderBottom: "1px solid rgba(142, 207, 142, 0.15)",
                      letterSpacing: "0.1em",
                    }}
                  >
                    SUBTITLE TRACKS:
                  </div>

                  <button
                    onClick={() => handleSelectSubtitle("off")}
                    style={{
                      background: activeSubtitleUrl === "off" ? "rgba(142,207,142,0.15)" : "transparent",
                      border: "none",
                      color: activeSubtitleUrl === "off" ? "#8ecf8e" : "rgba(142,207,142,0.7)",
                      fontFamily: "inherit",
                      fontSize: 10,
                      textAlign: "left",
                      padding: "8px 12px",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                    }}
                  >
                    <span>OFF (DISABLED)</span>
                    {activeSubtitleUrl === "off" && <Check size={11} />}
                  </button>

                  {streamData.subtitles?.map((sub) => {
                    const isSelected = activeSubtitleUrl === sub.url;
                    return (
                      <button
                        key={sub.url}
                        onClick={() => handleSelectSubtitle(sub.url)}
                        style={{
                          background: isSelected ? "rgba(142,207,142,0.15)" : "transparent",
                          border: "none",
                          color: isSelected ? "#8ecf8e" : "rgba(142,207,142,0.7)",
                          fontFamily: "inherit",
                          fontSize: 10,
                          textAlign: "left",
                          padding: "8px 12px",
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                        }}
                      >
                        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {sub.label}
                        </span>
                        {isSelected && <Check size={11} />}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Quality Menu Trigger */}
            <div style={{ position: "relative" }}>
              <button
                onClick={() => {
                  setShowQualityMenu(!showQualityMenu);
                  setShowSubtitleMenu(false);
                  setShowSpeedMenu(false);
                }}
                style={{
                  background: "transparent",
                  border: "1px solid rgba(142, 207, 142, 0.25)",
                  color: "rgba(142, 207, 142, 0.7)",
                  fontFamily: "inherit",
                  fontSize: 9,
                  fontWeight: 700,
                  padding: "4px 8px",
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4,
                }}
                title="Select Stream Quality"
              >
                <Layers size={11} />
                <span>{activeQualityLabel}</span>
              </button>

              {/* Quality Popover Menu */}
              {showQualityMenu && (
                <div
                  style={{
                    position: "absolute",
                    bottom: 32,
                    right: 0,
                    width: 150,
                    background: "rgba(8, 14, 8, 0.98)",
                    border: "1px solid #8ecf8e",
                    boxShadow: "0 0 16px rgba(0, 0, 0, 0.8)",
                    zIndex: 50,
                    display: "flex",
                    flexDirection: "column",
                  }}
                >
                  <div
                    style={{
                      padding: "8px 10px",
                      fontSize: 9,
                      color: "rgba(142,207,142,0.5)",
                      borderBottom: "1px solid rgba(142, 207, 142, 0.15)",
                      letterSpacing: "0.1em",
                    }}
                  >
                    QUALITY:
                  </div>

                  <button
                    onClick={() => handleSelectQuality(-1)}
                    style={{
                      background: currentQualityIndex === -1 ? "rgba(142,207,142,0.15)" : "transparent",
                      border: "none",
                      color: currentQualityIndex === -1 ? "#8ecf8e" : "rgba(142,207,142,0.7)",
                      fontFamily: "inherit",
                      fontSize: 10,
                      textAlign: "left",
                      padding: "8px 12px",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                    }}
                  >
                    <span>AUTO (ADAPTIVE)</span>
                    {currentQualityIndex === -1 && <Check size={11} />}
                  </button>

                  {availableQualities.map((q) => {
                    const isSelected = currentQualityIndex === q.index;
                    return (
                      <button
                        key={q.index}
                        onClick={() => handleSelectQuality(q.index)}
                        style={{
                          background: isSelected ? "rgba(142,207,142,0.15)" : "transparent",
                          border: "none",
                          color: isSelected ? "#8ecf8e" : "rgba(142,207,142,0.7)",
                          fontFamily: "inherit",
                          fontSize: 10,
                          textAlign: "left",
                          padding: "8px 12px",
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                        }}
                      >
                        <span>{q.label}</span>
                        {isSelected && <Check size={11} />}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Playback Speed Menu Trigger */}
            <div style={{ position: "relative" }}>
              <button
                onClick={() => {
                  setShowSpeedMenu(!showSpeedMenu);
                  setShowSubtitleMenu(false);
                  setShowQualityMenu(false);
                }}
                style={{
                  background: "transparent",
                  border: "1px solid rgba(142, 207, 142, 0.25)",
                  color: "rgba(142, 207, 142, 0.7)",
                  fontFamily: "inherit",
                  fontSize: 9,
                  fontWeight: 700,
                  padding: "4px 8px",
                  cursor: "pointer",
                }}
                title="Playback Speed"
              >
                {playbackRate}x
              </button>

              {/* Speed Popover Menu */}
              {showSpeedMenu && (
                <div
                  style={{
                    position: "absolute",
                    bottom: 32,
                    right: 0,
                    width: 120,
                    background: "rgba(8, 14, 8, 0.98)",
                    border: "1px solid #8ecf8e",
                    boxShadow: "0 0 16px rgba(0, 0, 0, 0.8)",
                    zIndex: 50,
                    display: "flex",
                    flexDirection: "column",
                  }}
                >
                  <div
                    style={{
                      padding: "8px 10px",
                      fontSize: 9,
                      color: "rgba(142,207,142,0.5)",
                      borderBottom: "1px solid rgba(142, 207, 142, 0.15)",
                      letterSpacing: "0.1em",
                    }}
                  >
                    SPEED:
                  </div>

                  {[0.5, 0.75, 1, 1.25, 1.5, 2].map((sp) => (
                    <button
                      key={sp}
                      onClick={() => handleSelectSpeed(sp)}
                      style={{
                        background: playbackRate === sp ? "rgba(142,207,142,0.15)" : "transparent",
                        border: "none",
                        color: playbackRate === sp ? "#8ecf8e" : "rgba(142,207,142,0.7)",
                        fontFamily: "inherit",
                        fontSize: 10,
                        textAlign: "left",
                        padding: "8px 12px",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                      }}
                    >
                      <span>{sp}x</span>
                      {playbackRate === sp && <Check size={11} />}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Picture-in-Picture */}
            <button
              onClick={togglePiP}
              style={{
                background: "transparent",
                border: "none",
                color: "rgba(142, 207, 142, 0.7)",
                cursor: "pointer",
                padding: 4,
              }}
              title="Picture-in-Picture"
            >
              <PictureInPicture size={16} />
            </button>

            {/* Native Fullscreen */}
            <button
              onClick={toggleFullscreen}
              style={{
                background: "transparent",
                border: "none",
                color: "#8ecf8e",
                cursor: "pointer",
                padding: 4,
              }}
              title="Fullscreen (F)"
            >
              {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
            </button>
          </div>
        </div>
      </div>

      <style jsx global>{`
        video::cue {
          background: rgba(6, 12, 6, 0.88);
          color: #8ecf8e;
          font-family: 'JetBrains Mono', monospace;
          font-size: 15px;
          text-shadow: 0 0 4px rgba(0, 0, 0, 0.9);
          padding: 3px 8px;
          border-radius: 2px;
          border: 1px solid rgba(142, 207, 142, 0.3);
        }
        @media (max-width: 600px) {
          .hidden-mobile {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
}
