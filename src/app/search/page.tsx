"use client";

import React, { useState, useEffect, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Search, Terminal } from "lucide-react";
import MediaCard from "@/components/MediaCard";
import MediaGridSkeleton from "@/components/skeletons/MediaGridSkeleton";
import SearchLoading from "./loading";
import { MediaDetail, MediaType } from "@/types";

function SearchContent() {
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get("q") || "";
  const initialType = (searchParams.get("type") as "all" | MediaType) || "all";

  const [query, setQuery] = useState(initialQuery);
  const [activeType, setActiveType] = useState<"all" | MediaType>(initialType);
  const [results, setResults] = useState<MediaDetail[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchResults = useCallback(async (q: string, type: string) => {
    if (!q.trim()) {
      fetch(`/api/content/trending?type=${type}`)
        .then((res) => res.json())
        .then((data) => {
          if (data?.ok) {
            if (type === "movie") setResults(data.data.popularMovies || []);
            else if (type === "tv") setResults(data.data.popularTV || []);
            else setResults(data.data.trending || []);
          }
        });
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/content/search?q=${encodeURIComponent(q)}&type=${type}`);
      const data = await res.json();
      if (data?.ok) {
        setResults(data.data.results || []);
      }
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchResults(query, activeType);
    }, 250);

    return () => clearTimeout(timer);
  }, [query, activeType, fetchResults]);

  return (
    <div style={{ maxWidth: 1440, margin: "0 auto", padding: "1.25rem 1rem 5rem 1rem" }}>
      {/* Search Header Container */}
      <div style={{ maxWidth: 680, margin: "0.5rem auto 2rem auto", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
        <div style={{ textAlign: "center" }}>
          <h1 style={{ fontSize: "1.35rem", fontWeight: 700, letterSpacing: "-0.02em" }}>Catalog Search</h1>
          <p className="font-mono" style={{ color: "var(--text-muted)", fontSize: "0.75rem", marginTop: 2 }}>
            INDEX_LOOKUP // TITLES, DIRECTORS, AND CAST
          </p>
        </div>

        {/* Search Input Box */}
        <div style={{ position: "relative", width: "100%" }}>
          <Search
            size={15}
            style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }}
          />
          <input
            type="text"
            placeholder="Search by title, keyword, or TMDB identifier..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="input-field font-mono"
            style={{
              paddingLeft: 34,
              paddingTop: 8,
              paddingBottom: 8,
              fontSize: "0.85rem",
              background: "var(--bg-surface)",
            }}
          />
        </div>

        {/* Media Type Filter Tabs */}
        <div style={{ display: "flex", justifyContent: "center", gap: "0.25rem", flexWrap: "wrap" }}>
          <button
            onClick={() => setActiveType("all")}
            className="btn"
            style={{
              padding: "3px 10px",
              fontSize: "0.75rem",
              fontFamily: "var(--font-mono)",
              background: activeType === "all" ? "var(--text-primary)" : "var(--bg-surface)",
              color: activeType === "all" ? "var(--text-inverse)" : "var(--text-secondary)",
              border: "1px solid var(--border-default)",
            }}
          >
            ALL_MEDIA
          </button>
          <button
            onClick={() => setActiveType("movie")}
            className="btn"
            style={{
              padding: "3px 10px",
              fontSize: "0.75rem",
              fontFamily: "var(--font-mono)",
              background: activeType === "movie" ? "var(--text-primary)" : "var(--bg-surface)",
              color: activeType === "movie" ? "var(--text-inverse)" : "var(--text-secondary)",
              border: "1px solid var(--border-default)",
            }}
          >
            MOVIES
          </button>
          <button
            onClick={() => setActiveType("tv")}
            className="btn"
            style={{
              padding: "3px 10px",
              fontSize: "0.75rem",
              fontFamily: "var(--font-mono)",
              background: activeType === "tv" ? "var(--text-primary)" : "var(--bg-surface)",
              color: activeType === "tv" ? "var(--text-inverse)" : "var(--text-secondary)",
              border: "1px solid var(--border-default)",
            }}
          >
            TV_SHOWS
          </button>
        </div>
      </div>

      {/* Results Header & Grid */}
      <div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: "0.75rem",
            paddingBottom: "0.5rem",
            borderBottom: "1px solid var(--border-subtle)",
          }}
        >
          <span className="font-mono" style={{ fontSize: "0.78rem", fontWeight: 600 }}>
            {query.trim() ? `QUERY: "${query}"` : `POPULAR_${activeType.toUpperCase()}`}
          </span>
          <span className="font-mono" style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>
            {results.length} MATCHES
          </span>
        </div>

        {loading ? (
          <MediaGridSkeleton count={12} />
        ) : results.length > 0 ? (
          <div className="responsive-media-grid">
            {results.map((item) => (
              <MediaCard key={`${item.mediaType}-${item.tmdbId}`} item={item} />
            ))}
          </div>
        ) : (
          <div
            className="panel"
            style={{
              padding: "3rem 1.5rem",
              textAlign: "center",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "0.5rem",
              background: "var(--bg-surface)",
            }}
          >
            <Terminal size={28} color="var(--text-muted)" />
            <h3 className="font-mono" style={{ fontSize: "0.88rem" }}>NULL_RESULTS_RETURNED</h3>
            <p style={{ color: "var(--text-muted)", maxWidth: 340, fontSize: "0.78rem" }}>
              No catalog items match your search term. Try broader keywords.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={<SearchLoading />}>
      <SearchContent />
    </Suspense>
  );
}
