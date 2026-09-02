"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { Server, AlertTriangle, RefreshCw, CheckCircle2, ShieldAlert, Activity } from "lucide-react";
import { MediaType, StreamOption } from "@/types";

interface PlayerProps {
  streams: StreamOption[];
  mediaType: MediaType;
  tmdbId: number;
  season?: number;
  episode?: number;
  title: string;
  posterPath?: string | null;
  initialProgressSeconds?: number;
}

export default function Player({
  streams,
  mediaType,
  tmdbId,
  season,
  episode,
  title,
  posterPath,
  initialProgressSeconds = 0,
}: PlayerProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [reportSuccess, setReportSuccess] = useState(false);
  const [isReporting, setIsReporting] = useState(false);
  const [iframeLoaded, setIframeLoaded] = useState(false);

  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const iframeLoadedRef = useRef(false);
  const activeStream = streams[currentIndex] || null;

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

  // Track playback activity (Only marks status as 'watching' once 50% half-mark is reached)
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
          progress: {
            timestampSeconds: secs,
            durationSeconds: estimatedDuration,
            lastSeason: season || null,
            lastEpisode: episode || null,
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
  }, [mediaType, tmdbId, season, episode, title, posterPath, initialProgressSeconds]);

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
    setIframeLoaded(true);
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
      </div>
    );
  }

  return (
    <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
      {/* Video Player Frame */}
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
        {activeStream ? (
          <iframe
            key={activeStream.url}
            src={activeStream.url}
            title={`${title} Player`}
            allowFullScreen
            allow="autoplay; encrypted-media; picture-in-picture"
            style={{ width: "100%", height: "100%", border: "none" }}
            onLoad={handleIframeLoad}
            onError={() => {
              reportFailure("onerror");
            }}
          />
        ) : null}
      </div>

      {/* Telemetry & Server Router Control Toolbar */}
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
        {/* Left: Server Switcher */}
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

        {/* Right: Health Telemetry & Failure Report & Mark Completed */}
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
              <Activity size={11} /> {activeStream.health}% HEALTH // {getHealthBadge(activeStream.health).status}
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
                    progress: {
                      timestampSeconds: mediaType === "tv" ? 1500 : 5400,
                      durationSeconds: mediaType === "tv" ? 1500 : 5400,
                      lastSeason: season || null,
                      lastEpisode: episode || null,
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
