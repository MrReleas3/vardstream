import { NextResponse } from "next/server";
import { fetchDirectStream } from "@/lib/nano-api";
import { MediaType } from "@/types";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);

  const rawId = searchParams.get("tmdb_id") || searchParams.get("id");
  const mediaType = (searchParams.get("type") || "movie") as MediaType;
  const rawSeason = searchParams.get("season");
  const rawEpisode = searchParams.get("episode");
  const provider = searchParams.get("provider") || undefined;
  const refresh = searchParams.get("refresh") === "true" || searchParams.get("refresh") === "1";

  if (!rawId) {
    return NextResponse.json(
      { ok: false, error: { code: "MISSING_ID", message: "Missing required parameter 'tmdb_id'" } },
      { status: 400 }
    );
  }

  const tmdbId = parseInt(rawId, 10);
  if (isNaN(tmdbId)) {
    return NextResponse.json(
      { ok: false, error: { code: "INVALID_ID", message: "Invalid media ID format" } },
      { status: 400 }
    );
  }

  const season = rawSeason ? parseInt(rawSeason, 10) : 1;
  const episode = rawEpisode ? parseInt(rawEpisode, 10) : 1;

  try {
    const result = await fetchDirectStream({
      tmdbId,
      mediaType,
      season,
      episode,
      provider,
      bypassCache: refresh,
    });

    if (!result.success || !result.streamUrl) {
      return NextResponse.json(
        {
          ok: false,
          error: {
            code: "STREAM_NOT_FOUND",
            message: result.error || "Direct stream source unavailable for this media",
            provider: result.provider,
          },
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      ok: true,
      data: result,
    });
  } catch (err: unknown) {
    const errorObj = err instanceof Error ? err : null;
    console.error("[Direct Stream Route Error]:", err);
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: "DIRECT_STREAM_ERROR",
          message: errorObj?.message || "Internal server error resolving direct stream",
        },
      },
      { status: 500 }
    );
  }
}
