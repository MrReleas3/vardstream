import React from "react";
import { notFound } from "next/navigation";
import {
  getMediaDetails,
  getSeasonEpisodes,
  getFranchiseRelations,
  getRecommendations,
} from "@/lib/tmdb";
import { resolveStreamOptions } from "@/lib/embed-router";
import TVShowDetailClient from "./TVShowDetailClient";

export default async function TVShowPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ season?: string }>;
}) {
  const { id } = await params;
  const { season: seasonQuery } = await searchParams;
  const tmdbId = parseInt(id, 10);

  if (isNaN(tmdbId)) {
    notFound();
  }

  const show = await getMediaDetails(tmdbId, "tv");
  if (!show) {
    notFound();
  }

  const firstSeason = show.seasons?.find((s: any) => s.seasonNumber > 0)?.seasonNumber || 1;
  const selectedSeason = seasonQuery ? parseInt(seasonQuery, 10) : firstSeason;

  const [episodes, streams, relations, recommendations] = await Promise.all([
    getSeasonEpisodes(tmdbId, selectedSeason),
    resolveStreamOptions("tv", tmdbId, selectedSeason, 1),
    getFranchiseRelations(tmdbId, "tv"),
    getRecommendations(tmdbId, "tv"),
  ]);

  return (
    <TVShowDetailClient
      show={show}
      initialEpisodes={episodes}
      initialStreams={streams}
      relations={relations}
      recommendations={recommendations}
      initialSeason={selectedSeason}
    />
  );
}
