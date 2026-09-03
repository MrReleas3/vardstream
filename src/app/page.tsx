"use client";

import React, { useState, useRef, useEffect, useCallback, useTransition } from "react";
import MediaCard from "@/components/MediaCard";
import { MediaDetail } from "@/types";

type FilterType = "ALL" | "ANIME" | "MOVIE" | "SERIES";

export default function SearchScreen() {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<FilterType>("ALL");
  const [results, setResults] = useState<MediaDetail[]>([]);
  const [loading, setLoading] = useState(false);
  const [inputFocused, setInputFocused] = useState(false);
  const [, startTransition] = useTransition();

  const inputRef = useRef<HTMLInputElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    // Focus input on mount
    const timer = setTimeout(() => {
      inputRef.current?.focus();
    }, 80);
    return () => clearTimeout(timer);
  }, []);

  const executeSearch = useCallback(async (q: string, activeFilter: FilterType) => {
    if (!q.trim()) {
      setResults([]);
      setLoading(false);
      return;
    }

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setLoading(true);

    const apiType =
      activeFilter === "ANIME"
        ? "anime"
        : activeFilter === "MOVIE"
        ? "movie"
        : activeFilter === "SERIES"
        ? "tv"
        : "all";

    try {
      const res = await fetch(
        `/api/content/search?q=${encodeURIComponent(q.trim())}&type=${apiType}`,
        { signal: controller.signal }
      );
      if (res.ok) {
        const data = await res.json();
        if (data?.ok && Array.isArray(data.data?.results)) {
          startTransition(() => {
            setResults(data.data.results);
          });
        }
      }
    } catch (err: any) {
      if (err.name !== "AbortError") {
        console.error("[SearchScreen] search error:", err);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  // Debounced search trigger (180ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      executeSearch(query, filter);
    }, 180);

    return () => clearTimeout(timer);
  }, [query, filter, executeSearch]);

  return (
    <div
      className="page-pad"
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: "32px 20px 100px",
        fontFamily: "'JetBrains Mono', 'Share Tech Mono', monospace",
      }}
    >
      {/* Hero Section */}
      <div style={{ width: "100%", maxWidth: 680, marginBottom: 36 }}>
        <div style={{ textAlign: "center", marginBottom: 22 }}>
          <div
            className="hero-eyebrow"
            style={{
              fontSize: 10,
              letterSpacing: "0.28em",
              color: "rgba(142,207,142,0.38)",
              marginBottom: 10,
            }}
          >
            ══ MEDIA DATABASE TERMINAL ══
          </div>
          <h1
            className="glow-text hero-title"
            style={{
              fontSize: 34,
              fontWeight: 700,
              letterSpacing: "0.08em",
              lineHeight: 1.1,
              marginBottom: 8,
              color: "#8ecf8e",
            }}
          >
            VARD_stream
          </h1>
          <div
            className="hero-sub"
            style={{
              fontSize: 10,
              color: "rgba(142,207,142,0.32)",
              letterSpacing: "0.2em",
            }}
          >
            ANIME · MOVIES · TV SERIES
          </div>
        </div>

        {/* Search Input */}
        <div style={{ position: "relative" }}>
          <div
            style={{
              position: "absolute",
              left: 14,
              top: "50%",
              transform: "translateY(-50%)",
              fontSize: 13,
              color: "rgba(142,207,142,0.5)",
              pointerEvents: "none",
              fontWeight: 600,
            }}
          >
            {inputFocused || query ? ">" : ">>"}
          </div>
          <input
            ref={inputRef}
            className="search-input"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => setInputFocused(true)}
            onBlur={() => setInputFocused(false)}
            placeholder="SEARCH TITLES, GENRES..."
            style={{
              width: "100%",
              background: "rgba(8,14,8,0.8)",
              border: "1px solid rgba(142,207,142,0.35)",
              color: "#8ecf8e",
              fontFamily: "inherit",
              fontSize: 13,
              fontWeight: 500,
              letterSpacing: "0.05em",
              padding: "14px 44px 14px 36px",
              caretColor: "#8ecf8e",
              transition: "all 0.18s ease",
            }}
          />
          {query && (
            <button
              onClick={() => {
                setQuery("");
                inputRef.current?.focus();
              }}
              style={{
                position: "absolute",
                right: 12,
                top: "50%",
                transform: "translateY(-50%)",
                background: "transparent",
                border: "none",
                color: "rgba(142,207,142,0.5)",
                cursor: "pointer",
                fontFamily: "inherit",
                fontSize: 11,
                letterSpacing: "0.1em",
                padding: "6px 8px",
                lineHeight: 1,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = "#8ecf8e";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = "rgba(142,207,142,0.5)";
              }}
            >
              CLR
            </button>
          )}
        </div>

        {/* Filter Bar */}
        <div style={{ display: "flex", gap: 2, marginTop: 6 }}>
          {(["ALL", "ANIME", "MOVIE", "SERIES"] as const).map((f) => {
            const isActive = filter === f;
            return (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className="filter-btn"
                style={{
                  flex: 1,
                  background: isActive ? "rgba(142,207,142,0.12)" : "transparent",
                  border: `1px solid ${isActive ? "rgba(142,207,142,0.5)" : "rgba(142,207,142,0.12)"}`,
                  color: isActive ? "#8ecf8e" : "rgba(142,207,142,0.32)",
                  fontFamily: "inherit",
                  fontSize: 10,
                  letterSpacing: "0.14em",
                  padding: "9px 0",
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                  fontWeight: isActive ? 700 : 400,
                  textShadow: isActive ? "0 0 8px rgba(142,207,142,0.5)" : "none",
                }}
              >
                {f}
              </button>
            );
          })}
        </div>
      </div>

      {/* Idle State: When No Query Entered */}
      {!query.trim() && (
        <div style={{ textAlign: "center", padding: "32px 0", color: "rgba(142,207,142,0.22)" }}>
          <div
            className="idle-icon"
            style={{
              fontSize: 40,
              marginBottom: 12,
              lineHeight: 1,
              animation: "blink 1s step-end infinite",
            }}
          >
            _
          </div>
          <div style={{ fontSize: 10, letterSpacing: "0.25em", marginBottom: 5 }}>
            AWAITING INPUT
          </div>
          <div style={{ fontSize: 9, color: "rgba(142,207,142,0.14)", letterSpacing: "0.12em" }}>
            TYPE A TITLE, GENRE, OR KEYWORD TO BEGIN
          </div>
        </div>
      )}

      {/* Results State */}
      {query.trim() && (
        <>
          <div style={{ width: "100%", maxWidth: 1100, marginBottom: 14 }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                paddingBottom: 8,
                borderBottom: "1px solid rgba(142,207,142,0.1)",
              }}
            >
              <span
                className="section-header"
                style={{
                  fontSize: 10,
                  fontWeight: 600,
                  letterSpacing: "0.15em",
                  color: "rgba(142,207,142,0.6)",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  maxWidth: "70%",
                }}
              >
                RESULTS FOR &quot;{query.toUpperCase()}&quot;
              </span>
              <span
                style={{
                  fontSize: 9,
                  color: "rgba(142,207,142,0.3)",
                  letterSpacing: "0.08em",
                  flexShrink: 0,
                }}
              >
                {loading ? "SEARCHING..." : `${results.length} FOUND`}
              </span>
            </div>
          </div>

          {results.length > 0 ? (
            <div
              className="results-grid"
              style={{
                width: "100%",
                maxWidth: 1100,
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
                gap: 10,
              }}
            >
              {results.map((item) => (
                <MediaCard key={`${item.mediaType}-${item.tmdbId}`} item={item} />
              ))}
            </div>
          ) : !loading ? (
            <div style={{ textAlign: "center", padding: "50px 0", color: "rgba(142,207,142,0.25)" }}>
              <div style={{ fontSize: 28, marginBottom: 12, letterSpacing: "0.1em" }}>[ NULL ]</div>
              <div style={{ fontSize: 11, letterSpacing: "0.2em" }}>NO RECORDS MATCHING QUERY</div>
              <div
                style={{
                  fontSize: 10,
                  marginTop: 6,
                  color: "rgba(142,207,142,0.15)",
                  letterSpacing: "0.1em",
                }}
              >
                TRY DIFFERENT KEYWORDS
              </div>
            </div>
          ) : (
            <div style={{ textAlign: "center", padding: "50px 0", color: "rgba(142,207,142,0.4)" }}>
              <div style={{ fontSize: 11, letterSpacing: "0.2em" }}>SCANNING DATABASE...</div>
            </div>
          )}
        </>
      )}

      <style jsx>{`
        ::placeholder {
          color: rgba(142, 207, 142, 0.2);
          letter-spacing: 0.08em;
          font-size: 12px;
        }
        @media (max-width: 480px) {
          .hero-title {
            font-size: 24px !important;
            letter-spacing: 0.05em !important;
          }
          .hero-eyebrow {
            font-size: 9px !important;
            letter-spacing: 0.15em !important;
          }
          .hero-sub {
            font-size: 9px !important;
            letter-spacing: 0.14em !important;
          }
          .page-pad {
            padding-left: 14px !important;
            padding-right: 14px !important;
            padding-top: 24px !important;
          }
          .filter-btn {
            font-size: 9px !important;
            padding: 9px 2px !important;
            letter-spacing: 0.08em !important;
          }
          .results-grid {
            grid-template-columns: 1fr !important;
          }
          .idle-icon {
            font-size: 30px !important;
          }
        }
      `}</style>
    </div>
  );
}
