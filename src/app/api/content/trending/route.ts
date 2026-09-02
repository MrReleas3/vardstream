import { NextResponse } from "next/server";
import { getTrending, getPopular } from "@/lib/tmdb";
import { MediaType } from "@/types";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const type = (url.searchParams.get("type") as MediaType | "all") || "all";
  const window = (url.searchParams.get("window") as "day" | "week") || "day";

  try {
    const [trending, popularMovies, popularTV] = await Promise.allSettled([
      getTrending(type, window),
      getPopular("movie"),
      getPopular("tv"),
    ]);

    return NextResponse.json({
      ok: true,
      data: {
        trending: trending.status === "fulfilled" ? trending.value : [],
        popularMovies: popularMovies.status === "fulfilled" ? popularMovies.value : [],
        popularTV: popularTV.status === "fulfilled" ? popularTV.value : [],
      },
    });
  } catch (err: any) {
    console.error("[Content Trending Error]:", err);
    return NextResponse.json(
      { ok: false, error: { code: "CONTENT_FETCH_ERROR", message: "Failed to fetch trending content" } },
      { status: 500 }
    );
  }
}
