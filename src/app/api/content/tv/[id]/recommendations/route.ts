import { NextResponse } from "next/server";
import { getRecommendations } from "@/lib/tmdb";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const tmdbId = parseInt(id, 10);

  if (isNaN(tmdbId)) {
    return NextResponse.json(
      { ok: false, error: { code: "INVALID_ID", message: "Invalid TV show ID" } },
      { status: 400 }
    );
  }

  try {
    const url = new URL(req.url);
    const page = parseInt(url.searchParams.get("page") || "1", 10);
    const recommendations = await getRecommendations(tmdbId, "tv", page);

    return NextResponse.json(
      { ok: true, data: { recommendations } },
      { headers: { "Cache-Control": "public, s-maxage=7200, stale-while-revalidate=86400" } }
    );
  } catch (err: any) {
    console.error(`[TV Recommendations Error on ${tmdbId}]:`, err);
    return NextResponse.json(
      { ok: false, error: { code: "FETCH_ERROR", message: "Failed to fetch TV recommendations" } },
      { status: 500 }
    );
  }
}
