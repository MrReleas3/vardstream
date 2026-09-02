import React from "react";
import { notFound } from "next/navigation";
import { getMediaDetails, getRecommendations, getFranchiseRelations } from "@/lib/tmdb";
import { resolveStreamOptions } from "@/lib/embed-router";
import MovieDetailClient from "./MovieDetailClient";

export default async function MoviePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const tmdbId = parseInt(id, 10);

  if (isNaN(tmdbId)) {
    notFound();
  }

  const [movie, streams, relations, recommendations] = await Promise.all([
    getMediaDetails(tmdbId, "movie"),
    resolveStreamOptions("movie", tmdbId),
    getFranchiseRelations(tmdbId, "movie"),
    getRecommendations(tmdbId, "movie"),
  ]);

  if (!movie) {
    notFound();
  }

  return (
    <MovieDetailClient
      movie={movie}
      streams={streams}
      relations={relations}
      recommendations={recommendations}
    />
  );
}
