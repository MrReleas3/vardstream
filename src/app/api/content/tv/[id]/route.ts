import { NextResponse } from "next/server";
import { getMediaDetails } from "@/lib/tmdb";

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
    const show = await getMediaDetails(tmdbId, "tv");
    if (!show) {
      return NextResponse.json(
        { ok: false, error: { code: "NOT_FOUND", message: "TV show not found" } },
        { status: 404 }
      );
    }

    return NextResponse.json({ ok: true, data: { show } });
  } catch (err: any) {
    console.error(`[TV Details Error on ${tmdbId}]:`, err);
    return NextResponse.json(
      { ok: false, error: { code: "FETCH_ERROR", message: "Failed to fetch TV details" } },
      { status: 500 }
    );
  }
}
