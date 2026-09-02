import React from "react";
import HeroCarousel from "@/components/HeroCarousel";
import ContinueWatchingRail from "@/components/ContinueWatchingRail";
import InfiniteAnimeGrid from "@/components/InfiniteAnimeGrid";
import { getTrending, getPopular, getAnimeRail } from "@/lib/tmdb";
import { bootstrapDatabase } from "@/lib/seed";

export const revalidate = 300;

export default async function HomePage() {
  // Run bootstrap in background if needed without delaying page TTFB
  bootstrapDatabase().catch(() => {});

  const [trendingAll, popularMovies, animeData] = await Promise.all([
    getTrending("all", "day"),
    getPopular("movie"),
    getAnimeRail("first_air_date.desc", 1),
  ]);

  const carouselItems = trendingAll.length > 0 ? trendingAll : popularMovies;
  const animeItems = animeData?.results || [];
  const totalPages = animeData?.totalPages || 10;

  return (
    <div style={{ paddingBottom: "3rem" }}>
      {/* 1. Cinematic Hero Carousel */}
      <HeroCarousel items={carouselItems} />

      {/* 2. Dynamic Continue Watching Rail */}
      <ContinueWatchingRail />

      {/* 3. Latest Anime Feed */}
      <InfiniteAnimeGrid initialItems={animeItems} initialTotalPages={totalPages} />
    </div>
  );
}
