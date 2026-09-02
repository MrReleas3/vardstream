import { NextResponse } from "next/server";
import { getGenres } from "@/lib/tmdb";
import { MediaType } from "@/types";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ type: string }> }
) {
  const { type } = await params;
  const mediaType: MediaType = type === "tv" ? "tv" : "movie";

  try {
    const genres = await getGenres(mediaType);
    return NextResponse.json({
      ok: true,
      data: {
        mediaType,
        genres,
      },
    });
  } catch (err: any) {
    console.error("[Genre API Error]:", err);
    return NextResponse.json(
      { ok: false, error: { code: "GENRE_ERROR", message: "Failed to fetch genre dictionary" } },
      { status: 500 }
    );
  }
}
