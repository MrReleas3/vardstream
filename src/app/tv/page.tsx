"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Tv, Filter, Star, Sparkles, ChevronDown, RefreshCw, SlidersHorizontal } from "lucide-react";
import MediaCard from "@/components/MediaCard";
import { MediaDetail } from "@/types";

const TV_GENRES = [
  { id: 10759, name: "Action & Adventure" },
  { id: 16, name: "Animation" },
  { id: 35, name: "Comedy" },
  { id: 80, name: "Crime" },
  { id: 99, name: "Documentary" },
  { id: 18, name: "Drama" },
  { id: 10751, name: "Family" },
  { id: 10762, name: "Kids" },
  { id: 9648, name: "Mystery" },
  { id: 10763, name: "News" },
  { id: 10764, name: "Reality" },
  { id: 10765, name: "Sci-Fi & Fantasy" },
  { id: 10766, name: "Soap" },
  { id: 10767, name: "Talk" },
  { id: 10768, name: "War & Politics" },
  { id: 37, name: "Western" },
];

const SORT_OPTIONS = [
  { label: "Popularity (Desc)", value: "popularity.desc" },
  { label: "First Air Date (Newest)", value: "first_air_date.desc" },
  { label: "First Air Date (Oldest)", value: "first_air_date.asc" },
  { label: "Rating (Desc)", value: "vote_average.desc" },
  { label: "Title (A-Z)", value: "name.asc" },
];

const CATEGORIES = [
  { label: "Popular", value: "popular" },
  { label: "Airing Today", value: "airing_today" },
  { label: "On The Air", value: "on_the_air" },
  { label: "Top Rated", value: "top_rated" },
  { label: "Anime", value: "anime" },
];

export default function TVExplorerPage() {
  const [activeCategory, setActiveCategory] = useState<string>("popular");
  const [isCustomFilter, setIsCustomFilter] = useState<boolean>(false);
  const [sortBy, setSortBy] = useState<string>("popularity.desc");
  const [selectedGenres, setSelectedGenres] = useState<number[]>([]);
  const [selectedYear, setSelectedYear] = useState<string>("");
  const [minRating, setMinRating] = useState<number>(0);

  const [items, setItems] = useState<MediaDetail[]>([]);
  const [page, setPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [loading, setLoading] = useState<boolean>(true);
  const [loadingMore, setLoadingMore] = useState<boolean>(false);
  const [filterPanelOpen, setFilterPanelOpen] = useState<boolean>(false);

  const fetchTV = useCallback(
    async (pageNum: number, append: boolean = false) => {
      if (append) setLoadingMore(true);
      else setLoading(true);

      try {
        let url = `/api/content/discover?type=tv&page=${pageNum}`;

        if (!isCustomFilter) {
          url += `&category=${activeCategory}`;
          if (activeCategory === "anime") {
            url += `&sortBy=first_air_date.desc`;
          }
        } else {
          url += `&sortBy=${encodeURIComponent(sortBy)}`;
          if (selectedGenres.length > 0) {
            url += `&genres=${selectedGenres.join(",")}`;
          }
          if (selectedYear) {
            url += `&year=${selectedYear}`;
          }
          if (minRating > 0) {
            url += `&minRating=${minRating}`;
          }
        }

        const res = await fetch(url);
        const data = await res.json();

        if (data?.ok && data.data) {
          if (append) {
            setItems((prev) => [...prev, ...(data.data.results || [])]);
          } else {
            setItems(data.data.results || []);
          }
          setTotalPages(data.data.totalPages || 1);
        }
      } catch (err) {
        console.error(err);
      }

      setLoading(false);
      setLoadingMore(false);
    },
    [activeCategory, isCustomFilter, sortBy, selectedGenres, selectedYear, minRating]
  );

  useEffect(() => {
    setPage(1);
    fetchTV(1, false);
  }, [fetchTV]);

  const handleCategoryClick = (cat: string) => {
    setActiveCategory(cat);
    setIsCustomFilter(false);
    if (cat === "anime") {
      setSortBy("first_air_date.desc");
      setSelectedGenres([16]);
    } else {
      setSelectedGenres([]);
      setSortBy("popularity.desc");
    }
  };

  const toggleGenre = (genreId: number) => {
    setIsCustomFilter(true);
    setSelectedGenres((prev) =>
      prev.includes(genreId) ? prev.filter((id) => id !== genreId) : [...prev, genreId]
    );
  };

  const resetFilters = () => {
    setSelectedGenres([]);
    setSelectedYear("");
    setMinRating(0);
    setSortBy("popularity.desc");
    setIsCustomFilter(false);
    setActiveCategory("popular");
  };

  const handleLoadMore = () => {
    if (page < totalPages && !loadingMore) {
      const nextPage = page + 1;
      setPage(nextPage);
      fetchTV(nextPage, true);
    }
  };

  return (
    <div style={{ maxWidth: 1440, margin: "0 auto", padding: "1.25rem 1rem 5rem 1rem" }}>
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "space-between",
          marginBottom: "1.25rem",
          paddingBottom: "0.75rem",
          borderBottom: "1px solid var(--border-default)",
          flexWrap: "wrap",
          gap: "0.75rem",
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <h1 style={{ fontSize: "1.25rem", fontWeight: 700, letterSpacing: "-0.02em" }}>TV & Anime Explorer</h1>
            <span className="badge-mono badge-brand">SERIES</span>
          </div>
          <p style={{ color: "var(--text-muted)", fontSize: "0.78rem", marginTop: 2 }}>
            Episodic broadcasts, serialized anime, and multi-season archives
          </p>
        </div>

        {/* Categories Toolbar */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.35rem", flexWrap: "wrap" }}>
          <div
            style={{
              display: "flex",
              background: "var(--bg-surface)",
              border: "1px solid var(--border-default)",
              borderRadius: "var(--radius-xs)",
              padding: "2px",
              overflowX: "auto",
              maxWidth: "100%",
            }}
          >
            {CATEGORIES.map((cat) => {
              const isActive = !isCustomFilter && activeCategory === cat.value;
              return (
                <button
                  key={cat.value}
                  onClick={() => handleCategoryClick(cat.value)}
                  className="btn btn-ghost"
                  style={{
                    padding: "3px 8px",
                    fontSize: "0.75rem",
                    fontFamily: "var(--font-mono)",
                    background: isActive ? "var(--bg-surface-elevated)" : "transparent",
                    color: isActive ? "var(--text-primary)" : "var(--text-secondary)",
                    border: isActive ? "1px solid var(--border-default)" : "1px solid transparent",
                  }}
                >
                  {cat.label}
                </button>
              );
            })}
          </div>

          <button
            onClick={() => setFilterPanelOpen(!filterPanelOpen)}
            className="btn btn-secondary"
            style={{
              padding: "4px 10px",
              fontSize: "0.75rem",
              fontFamily: "var(--font-mono)",
              borderColor: isCustomFilter ? "var(--border-accent)" : undefined,
              gap: 5,
            }}
          >
            <SlidersHorizontal size={12} />
            <span>PARAMS</span>
            {isCustomFilter && (
              <span style={{ width: 4, height: 4, borderRadius: "50%", background: "var(--accent-brand)" }} />
            )}
            <ChevronDown
              size={12}
              style={{
                transform: filterPanelOpen ? "rotate(180deg)" : "rotate(0deg)",
                transition: "transform 0.15s ease",
              }}
            />
          </button>
        </div>
      </div>

      {/* Expandable Filter Box */}
      {filterPanelOpen && (
        <div
          className="panel animate-fade-in"
          style={{
            padding: "1rem",
            marginBottom: "1.25rem",
            display: "flex",
            flexDirection: "column",
            gap: "0.85rem",
            background: "var(--bg-subtle)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span className="font-mono" style={{ fontSize: "0.78rem", fontWeight: 600, color: "var(--text-primary)" }}>
              // QUERY_FILTERS
            </span>
            {isCustomFilter && (
              <button
                onClick={resetFilters}
                className="btn btn-ghost"
                style={{ padding: "2px 6px", fontSize: "0.72rem", fontFamily: "var(--font-mono)", color: "var(--text-muted)" }}
              >
                <RefreshCw size={10} /> RESET
              </button>
            )}
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
              gap: "0.75rem",
            }}
          >
            {/* Sort By */}
            <div>
              <label className="font-mono" style={{ display: "block", fontSize: "0.7rem", color: "var(--text-muted)", marginBottom: 3 }}>
                SORT_ORDER
              </label>
              <select
                value={sortBy}
                onChange={(e) => {
                  setIsCustomFilter(true);
                  setSortBy(e.target.value);
                }}
                className="select-field"
              >
                {SORT_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Year */}
            <div>
              <label className="font-mono" style={{ display: "block", fontSize: "0.7rem", color: "var(--text-muted)", marginBottom: 3 }}>
                FIRST_AIR_YEAR
              </label>
              <select
                value={selectedYear}
                onChange={(e) => {
                  setIsCustomFilter(true);
                  setSelectedYear(e.target.value);
                }}
                className="select-field"
              >
                <option value="">All Years</option>
                {Array.from({ length: 30 }, (_, i) => 2026 - i).map((yr) => (
                  <option key={yr} value={String(yr)}>
                    {yr}
                  </option>
                ))}
              </select>
            </div>

            {/* Rating */}
            <div>
              <label className="font-mono" style={{ display: "flex", justifyContent: "space-between", fontSize: "0.7rem", color: "var(--text-muted)", marginBottom: 3 }}>
                <span>MIN_SCORE</span>
                <span style={{ color: "#fde68a" }}>{minRating > 0 ? `★ ${minRating}+` : "ANY"}</span>
              </label>
              <input
                type="range"
                min="0"
                max="9"
                step="0.5"
                value={minRating}
                onChange={(e) => {
                  setIsCustomFilter(true);
                  setMinRating(parseFloat(e.target.value));
                }}
                style={{ width: "100%", accentColor: "var(--text-primary)", cursor: "pointer", marginTop: 4 }}
              />
            </div>
          </div>

          {/* Genres */}
          <div>
            <label className="font-mono" style={{ display: "block", fontSize: "0.7rem", color: "var(--text-muted)", marginBottom: 4 }}>
              GENRE_MATRIX
            </label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.25rem" }}>
              {TV_GENRES.map((g) => {
                const isSelected = selectedGenres.includes(g.id);
                return (
                  <button
                    key={g.id}
                    onClick={() => toggleGenre(g.id)}
                    className="btn"
                    style={{
                      padding: "2px 7px",
                      fontSize: "0.7rem",
                      fontFamily: "var(--font-mono)",
                      background: isSelected ? "var(--text-primary)" : "var(--bg-surface)",
                      color: isSelected ? "var(--text-inverse)" : "var(--text-secondary)",
                      border: isSelected ? "1px solid var(--text-primary)" : "1px solid var(--border-default)",
                      borderRadius: "var(--radius-xs)",
                    }}
                  >
                    {g.name}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Grid Content */}
      <div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.75rem" }}>
          <span className="font-mono" style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>
            STATUS: {items.length} TITLES (PAGE {page} OF {totalPages})
          </span>
        </div>

        {loading ? (
          <div style={{ textAlign: "center", padding: "4rem 2rem" }}>
            <div
              style={{
                width: 20,
                height: 20,
                border: "2px solid var(--border-default)",
                borderTopColor: "var(--text-primary)",
                borderRadius: "50%",
                animation: "spin 0.6s linear infinite",
                margin: "0 auto 0.75rem auto",
              }}
            />
            <p className="font-mono" style={{ color: "var(--text-muted)", fontSize: "0.75rem" }}>
              FETCHING_TV_CATALOG...
            </p>
          </div>
        ) : items.length > 0 ? (
          <>
            <div className="responsive-media-grid">
              {items.map((item, idx) => (
                <MediaCard key={`${item.tmdbId}-${idx}`} item={item} />
              ))}
            </div>

            {page < totalPages && (
              <div style={{ textAlign: "center", marginTop: "2.5rem" }}>
                <button
                  onClick={handleLoadMore}
                  disabled={loadingMore}
                  className="btn btn-secondary"
                  style={{
                    padding: "7px 20px",
                    fontSize: "0.8rem",
                    fontFamily: "var(--font-mono)",
                  }}
                >
                  {loadingMore ? (
                    <>
                      <div
                        style={{
                          width: 12,
                          height: 12,
                          border: "2px solid var(--border-strong)",
                          borderTopColor: "#fff",
                          borderRadius: "50%",
                          animation: "spin 0.6s linear infinite",
                        }}
                      />
                      <span>FETCHING_PAGE_{page + 1}...</span>
                    </>
                  ) : (
                    <span>LOAD_MORE // PAGE_{page + 1}</span>
                  )}
                </button>
              </div>
            )}
          </>
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
            <Tv size={28} color="var(--text-muted)" />
            <h3 className="font-mono" style={{ fontSize: "0.9rem" }}>NO_MATCHING_ENTRIES</h3>
            <p style={{ color: "var(--text-muted)", maxWidth: 360, fontSize: "0.78rem" }}>
              No catalog series matched your active filter parameters.
            </p>
            <button onClick={resetFilters} className="btn btn-secondary" style={{ marginTop: "0.4rem" }}>
              Reset Parameters
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
