import { NextResponse } from "next/server";
import { getSimilar } from "@/lib/tmdb";

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
    const url = new URL(req.url);
    const page = parseInt(url.searchParams.get("page") || "1", 10);
    const similar = await getSimilar(tmdbId, "movie", page);

    return NextResponse.json({ ok: true, data: { similar } });
  } catch (err: any) {
    console.error(`[Movie Similar Error on ${tmdbId}]:`, err);
    return NextResponse.json(
      { ok: false, error: { code: "FETCH_ERROR", message: "Failed to fetch similar movies" } },
      { status: 500 }
    );
  }
}
