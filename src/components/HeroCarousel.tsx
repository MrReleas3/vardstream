"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { Play, Star, Info, ChevronLeft, ChevronRight, Calendar } from "lucide-react";
import { MediaDetail } from "@/types";
import WatchlistDropdown from "./WatchlistDropdown";

interface HeroCarouselProps {
  items: MediaDetail[];
  autoPlayInterval?: number;
}

export default function HeroCarousel({ items, autoPlayInterval = 8000 }: HeroCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [watchlistMap, setWatchlistMap] = useState<Record<number, boolean>>({});
  const [loadingWatchlist, setLoadingWatchlist] = useState<number | null>(null);
  const [isPaused, setIsPaused] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const validItems = items && items.length > 0 ? items.slice(0, 8) : [];
  const currentItem = validItems[currentIndex];

  const handleNext = useCallback(() => {
    if (validItems.length <= 1) return;
    setCurrentIndex((prev) => (prev + 1) % validItems.length);
  }, [validItems.length]);

  const handlePrev = useCallback(() => {
    if (validItems.length <= 1) return;
    setCurrentIndex((prev) => (prev - 1 + validItems.length) % validItems.length);
  }, [validItems.length]);

  useEffect(() => {
    if (isPaused || validItems.length <= 1) return;
    timerRef.current = setInterval(() => {
      handleNext();
    }, autoPlayInterval);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPaused, validItems.length, autoPlayInterval, handleNext]);

  if (!currentItem) return null;

  const targetUrl = `/${currentItem.mediaType}/${currentItem.tmdbId}`;
  const isInWatchlist = !!watchlistMap[currentItem.tmdbId];

  const toggleWatchlist = async () => {
    if (!currentItem) return;
    setLoadingWatchlist(currentItem.tmdbId);
    try {
      const willBeIn = !isInWatchlist;
      const res = await fetch(`/api/activities/${currentItem.mediaType}/${currentItem.tmdbId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: willBeIn ? "plan_to_watch" : "dropped",
          isFavorite: willBeIn,
          title: currentItem.title,
          posterPath: currentItem.posterPath,
          backdropPath: currentItem.backdropPath,
        }),
      });
      if (res.ok) {
        setWatchlistMap((prev) => ({ ...prev, [currentItem.tmdbId]: willBeIn }));
      }
    } catch {}
    setLoadingWatchlist(null);
  };

  const releaseYear =
    currentItem.releaseDate?.substring(0, 4) ||
    currentItem.firstAirDate?.substring(0, 4) ||
    "";

  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        minHeight: "48vh",
        maxHeight: "600px",
        display: "flex",
        alignItems: "center",
        borderBottom: "1px solid var(--border-default)",
        marginBottom: "1.5rem",
        background: "var(--bg-canvas)",
      }}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* Background Backdrop Image Container (Clips backdrop images only) */}
      <div style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none" }}>
        {validItems.map((item, idx) => {
          const isCurrent = idx === currentIndex;
          // Only load image URL if active to save memory & eliminate mobile GPU lag
          const shouldLoad = Math.abs(idx - currentIndex) <= 1 || (currentIndex === 0 && idx === validItems.length - 1) || (currentIndex === validItems.length - 1 && idx === 0);

          return (
            <div
              key={item.tmdbId}
              style={{
                position: "absolute",
                inset: 0,
                backgroundImage: shouldLoad && item.backdropPath ? `url(${item.backdropPath})` : "none",
                backgroundSize: "cover",
                backgroundPosition: "center 20%",
                filter: "brightness(0.38) contrast(1.1)",
                opacity: isCurrent ? 1 : 0,
                transition: "opacity 0.5s ease",
                zIndex: isCurrent ? 1 : 0,
              }}
            />
          );
        })}

        {/* Structural Minimal Gradients */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "linear-gradient(180deg, rgba(9, 9, 11, 0.1) 0%, rgba(9, 9, 11, 0.75) 60%, #09090b 100%), linear-gradient(90deg, #09090b 0%, rgba(9, 9, 11, 0.85) 45%, rgba(9, 9, 11, 0.15) 100%)",
            zIndex: 2,
          }}
        />
      </div>

      {/* Content Area */}
      <div
        key={currentItem.tmdbId}
        style={{
          position: "relative",
          zIndex: 10,
          maxWidth: 750,
          padding: "2.5rem 1rem",
          display: "flex",
          flexDirection: "column",
          gap: "0.75rem",
          width: "100%",
        }}
      >
        {/* Metadata Badges */}
        <div style={{ display: "flex", alignItems: "center", gap: 5, flexWrap: "wrap" }}>
          <span className="badge-mono badge-brand">
            {currentItem.mediaType === "tv" ? "TV_SERIES" : "FEATURE_FILM"}
          </span>

          {currentItem.voteAverage > 0 && (
            <span className="badge-mono badge-amber">
              <Star size={9} fill="#fde68a" />
              TMDB {currentItem.voteAverage.toFixed(1)}
            </span>
          )}

          {releaseYear && (
            <span className="badge-mono">
              <Calendar size={9} /> {releaseYear}
            </span>
          )}

          {currentItem.genres?.slice(0, 2).map((g) => (
            <span key={g.id} className="badge-mono">
              {g.name}
            </span>
          ))}
        </div>

        {/* Title */}
        <h1
          style={{
            fontSize: "clamp(1.6rem, 4vw, 2.8rem)",
            fontWeight: 800,
            lineHeight: 1.15,
            letterSpacing: "-0.03em",
            color: "#ffffff",
          }}
        >
          {currentItem.title}
        </h1>

        {/* Overview */}
        <p
          style={{
            fontSize: "0.82rem",
            color: "var(--text-muted)",
            lineHeight: 1.5,
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
            maxWidth: 580,
          }}
        >
          {currentItem.overview}
        </p>

        {/* CTA Actions */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginTop: "0.25rem", flexWrap: "wrap" }}>
          <Link
            href={targetUrl}
            className="btn btn-primary"
            style={{ padding: "7px 16px", fontSize: "0.82rem", gap: 6 }}
          >
            <Play size={13} fill="#000" color="#000" /> Watch Now
          </Link>

          <WatchlistDropdown
            mediaType={currentItem.mediaType}
            tmdbId={currentItem.tmdbId}
            title={currentItem.title}
            posterPath={currentItem.posterPath}
            backdropPath={currentItem.backdropPath}
            variant="button"
          />

          <Link
            href={targetUrl}
            className="btn btn-outline"
            style={{ padding: "7px 10px" }}
            title="Inspect Metadata"
          >
            <Info size={14} />
          </Link>
        </div>
      </div>

      {/* Navigation Controls */}
      {validItems.length > 1 && (
        <div
          style={{
            position: "absolute",
            bottom: "1rem",
            right: "1rem",
            zIndex: 20,
            display: "flex",
            alignItems: "center",
            gap: "0.35rem",
            background: "rgba(9, 9, 11, 0.85)",
            border: "1px solid var(--border-default)",
            borderRadius: "var(--radius-xs)",
            padding: "3px 6px",
          }}
        >
          <button
            onClick={handlePrev}
            className="btn btn-ghost"
            style={{ width: 22, height: 22, padding: 0 }}
            aria-label="Previous Slide"
          >
            <ChevronLeft size={14} />
          </button>

          <div style={{ display: "flex", alignItems: "center", gap: "3px", padding: "0 2px" }}>
            {validItems.map((item, idx) => {
              const isActive = idx === currentIndex;
              return (
                <button
                  key={item.tmdbId}
                  onClick={() => setCurrentIndex(idx)}
                  style={{
                    width: isActive ? 14 : 5,
                    height: 2,
                    background: isActive ? "var(--text-primary)" : "var(--border-strong)",
                    border: "none",
                    cursor: "pointer",
                    padding: 0,
                  }}
                  title={item.title}
                  aria-label={`Slide ${idx + 1}`}
                />
              );
            })}
          </div>

          <button
            onClick={handleNext}
            className="btn btn-ghost"
            style={{ width: 22, height: 22, padding: 0 }}
            aria-label="Next Slide"
          >
            <ChevronRight size={14} />
          </button>
        </div>
      )}
    </div>
  );
}
