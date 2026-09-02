import { NextResponse } from "next/server";
import { getSeasonEpisodes } from "@/lib/tmdb";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string; seasonNum: string }> }
) {
  const { id, seasonNum } = await params;
  const tmdbId = parseInt(id, 10);
  const sNum = parseInt(seasonNum, 10);

  if (isNaN(tmdbId) || isNaN(sNum)) {
    return NextResponse.json(
      { ok: false, error: { code: "INVALID_PARAMS", message: "Invalid TV show ID or season number" } },
      { status: 400 }
    );
  }

  try {
    const episodes = await getSeasonEpisodes(tmdbId, sNum);
    return NextResponse.json(
      { ok: true, data: { episodes } },
      { headers: { "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=604800" } }
    );
  } catch (err: any) {
    console.error(`[Season Episodes Error on ${tmdbId} s${sNum}]:`, err);
    return NextResponse.json(
      { ok: false, error: { code: "FETCH_ERROR", message: "Failed to fetch season episodes" } },
      { status: 500 }
    );
  }
}
