"use client";

import React from "react";
import Link from "next/link";
import { Play, Star, Info } from "lucide-react";
import { MediaDetail } from "@/types";
import WatchlistDropdown from "./WatchlistDropdown";

interface HeroBannerProps {
  item?: MediaDetail | null;
}

export default function HeroBanner({ item }: HeroBannerProps) {
  if (!item) return null;

  const targetUrl = `/${item.mediaType}/${item.tmdbId}`;

  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        minHeight: "55vh",
        maxHeight: "650px",
        display: "flex",
        alignItems: "center",
        borderBottom: "1px solid var(--border-default)",
        marginBottom: "2rem",
        background: "var(--bg-canvas)",
      }}
    >
      {/* Background Backdrop Image & Gradients (Clips backdrop only) */}
      <div style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none" }}>
        {item.backdropPath && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              backgroundImage: `url(${item.backdropPath})`,
              backgroundSize: "cover",
              backgroundPosition: "center 20%",
              filter: "brightness(0.4) contrast(1.1)",
            }}
          />
        )}

        {/* Gradient Overlays */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "linear-gradient(180deg, rgba(9, 9, 11, 0.1) 0%, rgba(9, 9, 11, 0.75) 65%, #09090b 100%), linear-gradient(90deg, #09090b 0%, rgba(9, 9, 11, 0.85) 45%, rgba(9, 9, 11, 0.15) 100%)",
          }}
        />
      </div>

      {/* Content Container */}
      <div
        style={{
          position: "relative",
          zIndex: 10,
          maxWidth: 750,
          padding: "3.5rem 2rem",
          display: "flex",
          flexDirection: "column",
          gap: "1rem",
        }}
        className="animate-fade-in"
      >
        <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
          <span className="badge-mono badge-brand">
            FEATURED // {item.mediaType?.toUpperCase()}
          </span>

          {item.voteAverage > 0 && (
            <span className="badge-mono badge-amber">
              <Star size={10} fill="#fde68a" /> {item.voteAverage.toFixed(1)}
            </span>
          )}

          {item.genres?.slice(0, 3).map((g) => (
            <span key={g.id} className="badge-mono">
              {g.name}
            </span>
          ))}
        </div>

        <h1
          style={{
            fontSize: "clamp(2rem, 4.5vw, 3.2rem)",
            fontWeight: 800,
            lineHeight: 1.1,
            letterSpacing: "-0.03em",
          }}
        >
          {item.title}
        </h1>

        {item.tagline && (
          <p style={{ fontSize: "0.95rem", color: "var(--text-secondary)", fontStyle: "italic" }}>
            &ldquo;{item.tagline}&rdquo;
          </p>
        )}

        <p
          style={{
            fontSize: "0.88rem",
            color: "var(--text-muted)",
            lineHeight: 1.6,
            display: "-webkit-box",
            WebkitLineClamp: 3,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
            maxWidth: 620,
          }}
        >
          {item.overview}
        </p>

        <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginTop: "0.5rem", flexWrap: "wrap" }}>
          <Link
            href={targetUrl}
            className="btn btn-primary"
            style={{ padding: "9px 20px", fontSize: "0.88rem", gap: 8 }}
          >
            <Play size={14} fill="#000" color="#000" /> Watch Now
          </Link>

          <WatchlistDropdown
            mediaType={item.mediaType || "movie"}
            tmdbId={item.tmdbId}
            title={item.title}
            posterPath={item.posterPath}
            backdropPath={item.backdropPath}
            variant="button"
          />

          <Link href={targetUrl} className="btn btn-outline" style={{ padding: "9px 12px" }} title="Details">
            <Info size={15} />
          </Link>
        </div>
      </div>
    </div>
  );
}
