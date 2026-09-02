"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import MediaCard from "./MediaCard";
import { MediaDetail } from "@/types";
import { Terminal } from "lucide-react";

interface InfiniteAnimeGridProps {
  initialItems: MediaDetail[];
  initialTotalPages?: number;
}

export default function InfiniteAnimeGrid({
  initialItems = [],
  initialTotalPages = 10,
}: InfiniteAnimeGridProps) {
  const [items, setItems] = useState<MediaDetail[]>(initialItems);
  const [page, setPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(initialTotalPages);
  const [loading, setLoading] = useState<boolean>(false);
  const [hasMore, setHasMore] = useState<boolean>(true);

  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const isFetchingRef = useRef<boolean>(false);

  const loadMoreAnime = useCallback(async () => {
    if (isFetchingRef.current || !hasMore) return;
    isFetchingRef.current = true;
    setLoading(true);

    try {
      const nextPage = page + 1;
      const res = await fetch(
        `/api/content/discover?type=tv&category=anime&sortBy=first_air_date.desc&page=${nextPage}`
      );
      const data = await res.json();

      if (data?.ok && data.data?.results) {
        const newResults: MediaDetail[] = data.data.results;
        if (newResults.length === 0) {
          setHasMore(false);
        } else {
          setItems((prev) => {
            const existingIds = new Set(prev.map((i) => i.tmdbId));
            const uniqueNew = newResults.filter((i) => !existingIds.has(i.tmdbId));
            return [...prev, ...uniqueNew];
          });
          setPage(nextPage);
          if (data.data.totalPages && nextPage >= data.data.totalPages) {
            setHasMore(false);
          }
        }
      } else {
        setHasMore(false);
      }
    } catch (err) {
      console.error("[InfiniteAnimeGrid] Error loading more anime:", err);
      setHasMore(false);
    }

    setLoading(false);
    isFetchingRef.current = false;
  }, [page, hasMore]);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || !hasMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !isFetchingRef.current && hasMore) {
          loadMoreAnime();
        }
      },
      {
        root: null,
        rootMargin: "300px",
        threshold: 0.1,
      }
    );

    observer.observe(sentinel);

    return () => {
      observer.disconnect();
    };
  }, [loadMoreAnime, hasMore]);

  return (
    <section style={{ marginTop: "1rem", padding: "0 1rem" }}>
      {/* Section Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "1rem",
          paddingBottom: "0.5rem",
          borderBottom: "1px solid var(--border-subtle)",
          flexWrap: "wrap",
          gap: "0.5rem",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <h2 style={{ fontSize: "0.95rem", fontWeight: 700 }}>Latest Anime Feed</h2>
          <span className="badge-mono badge-brand">FIRST_AIR_DATE.DESC</span>
        </div>

        <div className="font-mono" style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>
          {items.length} TITLES
        </div>
      </div>

      {/* Responsive Media Grid */}
      <div className="responsive-media-grid">
        {items.map((item, idx) => (
          <MediaCard key={`${item.tmdbId}-${idx}`} item={item} />
        ))}
      </div>

      {/* Sentinel & Scroll Loader */}
      <div
        ref={sentinelRef}
        style={{
          minHeight: "60px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          marginTop: "1.5rem",
        }}
      >
        {loading && (
          <div
            className="panel font-mono"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "5px 12px",
              fontSize: "0.75rem",
              color: "var(--text-secondary)",
            }}
          >
            <div
              style={{
                width: 12,
                height: 12,
                border: "2px solid var(--border-strong)",
                borderTopColor: "var(--text-primary)",
                borderRadius: "50%",
                animation: "spin 0.6s linear infinite",
              }}
            />
            <span>STREAMING_NEXT_BATCH...</span>
          </div>
        )}

        {!hasMore && items.length > 0 && (
          <div
            className="font-mono"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              color: "var(--text-muted)",
              fontSize: "0.72rem",
            }}
          >
            <Terminal size={12} />
            <span>[CATALOG_END_REACHED]</span>
          </div>
        )}
      </div>
    </section>
  );
}
