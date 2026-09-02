import { NextResponse } from "next/server";
import { getMediaDetails } from "@/lib/tmdb";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const tmdbId = parseInt(id, 10);

  if (isNaN(tmdbId)) {
    return NextResponse.json(
      { ok: false, error: { code: "INVALID_ID", message: "Invalid movie ID" } },
      { status: 400 }
    );
  }

  try {
    const movie = await getMediaDetails(tmdbId, "movie");
    if (!movie) {
      return NextResponse.json(
        { ok: false, error: { code: "NOT_FOUND", message: "Movie not found" } },
        { status: 404 }
      );
    }

    return NextResponse.json({ ok: true, data: { movie } });
  } catch (err: any) {
    console.error(`[Movie Details Error on ${tmdbId}]:`, err);
    return NextResponse.json(
      { ok: false, error: { code: "FETCH_ERROR", message: "Failed to fetch movie details" } },
      { status: 500 }
    );
  }
}
