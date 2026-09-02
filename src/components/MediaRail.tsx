"use client";

import React, { useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import MediaCard from "./MediaCard";
import { MediaDetail, UserActivity } from "@/types";

interface MediaRailProps {
  title: string;
  subtitle?: string;
  items: (MediaDetail | UserActivity)[];
  showProgress?: boolean;
  onRemoveItem?: (id: number) => void;
  onCardClick?: (item: any) => void;
}

export default function MediaRail({
  title,
  subtitle,
  items,
  showProgress = false,
  onRemoveItem,
  onCardClick,
}: MediaRailProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  if (!items || items.length === 0) return null;

  const handleScroll = (direction: "left" | "right") => {
    if (scrollRef.current) {
      const scrollAmount = direction === "left" ? -450 : 450;
      scrollRef.current.scrollBy({ left: scrollAmount, behavior: "smooth" });
    }
  };

  return (
    <section style={{ marginBottom: "1.75rem", position: "relative" }}>
      {/* Rail Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "0.75rem",
          padding: "0 1rem",
          borderBottom: "1px solid var(--border-subtle)",
          paddingBottom: "0.5rem",
        }}
      >
        <div style={{ display: "flex", alignItems: "baseline", gap: "0.5rem", flexWrap: "wrap" }}>
          <h2 style={{ fontSize: "0.95rem", fontWeight: 700, letterSpacing: "-0.01em" }}>{title}</h2>
          {subtitle && (
            <span style={{ fontSize: "0.72rem", color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>
              // {subtitle}
            </span>
          )}
        </div>

        {/* Scroll Controls */}
        <div style={{ display: "flex", gap: "0.25rem", alignItems: "center" }}>
          <span className="font-mono" style={{ fontSize: "0.68rem", color: "var(--text-muted)", marginRight: 4 }}>
            {items.length} titles
          </span>
          <button
            onClick={() => handleScroll("left")}
            className="btn btn-secondary"
            style={{ width: 24, height: 24, padding: 0, borderRadius: "var(--radius-xs)" }}
            title="Scroll Left"
          >
            <ChevronLeft size={13} />
          </button>
          <button
            onClick={() => handleScroll("right")}
            className="btn btn-secondary"
            style={{ width: 24, height: 24, padding: 0, borderRadius: "var(--radius-xs)" }}
            title="Scroll Right"
          >
            <ChevronRight size={13} />
          </button>
        </div>
      </div>

      {/* Horizontal Scroll Track */}
      <div
        ref={scrollRef}
        style={{
          display: "flex",
          gap: "0.75rem",
          overflowX: "auto",
          padding: "0.25rem 1rem 0.5rem 1rem",
          scrollSnapType: "x mandatory",
          scrollbarWidth: "none",
          WebkitOverflowScrolling: "touch",
        }}
      >
        {items.map((item, idx) => {
          const mediaId = "progress" in item ? (item as UserActivity).mediaId : (item as MediaDetail).tmdbId;
          return (
            <div key={idx} style={{ scrollSnapAlign: "start", flexShrink: 0, width: "clamp(130px, 36vw, 165px)" }}>
              <MediaCard
                item={item}
                showProgress={showProgress}
                showRemove={showProgress}
                onRemove={() => onRemoveItem?.(mediaId)}
                onCardClick={onCardClick}
              />
            </div>
          );
        })}
      </div>
    </section>
  );
}
