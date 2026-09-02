"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Film, Filter, Star, Sparkles, ChevronDown, RefreshCw, SlidersHorizontal } from "lucide-react";
import MediaCard from "@/components/MediaCard";
import MediaGridSkeleton from "@/components/skeletons/MediaGridSkeleton";
import { MediaDetail } from "@/types";

const MOVIE_GENRES = [
  { id: 28, name: "Action" },
  { id: 12, name: "Adventure" },
  { id: 16, name: "Animation" },
  { id: 35, name: "Comedy" },
  { id: 80, name: "Crime" },
  { id: 99, name: "Documentary" },
  { id: 18, name: "Drama" },
  { id: 10751, name: "Family" },
  { id: 14, name: "Fantasy" },
  { id: 36, name: "History" },
  { id: 27, name: "Horror" },
  { id: 10402, name: "Music" },
  { id: 9648, name: "Mystery" },
  { id: 10749, name: "Romance" },
  { id: 878, name: "Sci-Fi" },
  { id: 53, name: "Thriller" },
  { id: 10752, name: "War" },
  { id: 37, name: "Western" },
];

const SORT_OPTIONS = [
  { label: "Popularity (Desc)", value: "popularity.desc" },
  { label: "Popularity (Asc)", value: "popularity.asc" },
  { label: "Rating (Desc)", value: "vote_average.desc" },
  { label: "Release Date (Newest)", value: "primary_release_date.desc" },
  { label: "Release Date (Oldest)", value: "primary_release_date.asc" },
  { label: "Title (A-Z)", value: "title.asc" },
];

const CATEGORIES = [
  { label: "Popular", value: "popular" },
  { label: "Now Playing", value: "now_playing" },
  { label: "Upcoming", value: "upcoming" },
  { label: "Top Rated", value: "top_rated" },
];

export default function MoviesExplorerPage() {
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

  const fetchMovies = useCallback(
    async (pageNum: number, append: boolean = false) => {
      if (append) setLoadingMore(true);
      else setLoading(true);

      try {
        let url = `/api/content/discover?type=movie&page=${pageNum}`;

        if (!isCustomFilter) {
          url += `&category=${activeCategory}`;
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
    fetchMovies(1, false);
  }, [fetchMovies]);

  const handleCategoryClick = (cat: string) => {
    setActiveCategory(cat);
    setIsCustomFilter(false);
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
      fetchMovies(nextPage, true);
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
            <h1 style={{ fontSize: "1.25rem", fontWeight: 700, letterSpacing: "-0.02em" }}>Movies Explorer</h1>
            <span className="badge-mono">CATALOG</span>
          </div>
          <p style={{ color: "var(--text-muted)", fontSize: "0.78rem", marginTop: 2 }}>
            Theatrical releases, box office metrics, and archived cinema
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
                RELEASE_YEAR
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
              {MOVIE_GENRES.map((g) => {
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
          <MediaGridSkeleton count={18} />
        ) : items.length > 0 ? (
          <>
            <div className="responsive-media-grid">
              {items.map((item, idx) => (
                <MediaCard key={`${item.tmdbId}-${idx}`} item={item} />
              ))}
            </div>

            {loadingMore && (
              <div style={{ marginTop: "1rem" }}>
                <MediaGridSkeleton count={6} />
              </div>
            )}

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
            <Film size={28} color="var(--text-muted)" />
            <h3 className="font-mono" style={{ fontSize: "0.9rem" }}>NO_MATCHING_ENTRIES</h3>
            <p style={{ color: "var(--text-muted)", maxWidth: 360, fontSize: "0.78rem" }}>
              No catalog entries matched your active filter parameters.
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
