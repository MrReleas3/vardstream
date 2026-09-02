import { NextResponse } from "next/server";
import {
  discoverMedia,
  getMovieCategory,
  getTVCategory,
  getAnimeRail,
  MovieCategory,
  TVCategory,
} from "@/lib/tmdb";
import { MediaType } from "@/types";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const type = (url.searchParams.get("type") as MediaType) || "movie";
  const category = url.searchParams.get("category");
  const sortBy = url.searchParams.get("sortBy") || undefined;
  const genres = url.searchParams.get("genres") || undefined;
  const year = url.searchParams.get("year") || undefined;
  const minRating = url.searchParams.get("minRating")
    ? parseFloat(url.searchParams.get("minRating")!)
    : undefined;
  const language = url.searchParams.get("language") || undefined;
  const page = parseInt(url.searchParams.get("page") || "1", 10);

  try {
    const cacheHeaders = {
      "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
    };

    // If a specific preset category is requested and no custom filter overrides are present
    if (category && !genres && !year && !minRating && !sortBy) {
      if (type === "movie") {
        const data = await getMovieCategory(category as MovieCategory, page);
        return NextResponse.json({ ok: true, data }, { headers: cacheHeaders });
      } else {
        const data = await getTVCategory(category as TVCategory, page);
        return NextResponse.json({ ok: true, data }, { headers: cacheHeaders });
      }
    }

    // Special anime shortcut
    if (category === "anime") {
      const data = await getAnimeRail(sortBy || "first_air_date.desc", page, language);
      return NextResponse.json({ ok: true, data }, { headers: cacheHeaders });
    }

    // General discovery with dynamic filters
    const data = await discoverMedia(type, {
      sortBy,
      genres,
      year,
      minRating,
      language,
      page,
    });

    return NextResponse.json({ ok: true, data }, { headers: cacheHeaders });
  } catch (err: any) {
    console.error("[Discover API Error]:", err);
    return NextResponse.json(
      { ok: false, error: { code: "DISCOVER_ERROR", message: "Failed to discover content" } },
      { status: 500 }
    );
  }
}
