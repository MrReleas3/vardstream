import { NextResponse } from "next/server";
import { resolveStreamOptions } from "@/lib/embed-router";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string; season: string; episode: string }> }
) {
  const { id, season, episode } = await params;
  const tmdbId = parseInt(id, 10);
  const sNum = parseInt(season, 10);
  const epNum = parseInt(episode, 10);

  if (isNaN(tmdbId) || isNaN(sNum) || isNaN(epNum)) {
    return NextResponse.json(
      { ok: false, error: { code: "INVALID_PARAMS", message: "Invalid TV show, season, or episode identifiers" } },
      { status: 400 }
    );
  }

  try {
    const streams = await resolveStreamOptions("tv", tmdbId, sNum, epNum);
    return NextResponse.json({
      ok: true,
      data: {
        mediaId: tmdbId,
        mediaType: "tv",
        season: sNum,
        episode: epNum,
        streams,
      },
    });
  } catch (err: any) {
    console.error(`[Stream Resolver Error on TV ${tmdbId} s${sNum}e${epNum}]:`, err);
    return NextResponse.json(
      { ok: false, error: { code: "RESOLVER_ERROR", message: "Failed to resolve stream options" } },
      { status: 500 }
    );
  }
}
