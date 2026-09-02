import { NextResponse } from "next/server";
import { resolveStreamOptions } from "@/lib/embed-router";

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
    const streams = await resolveStreamOptions("movie", tmdbId);
    return NextResponse.json({
      ok: true,
      data: {
        mediaId: tmdbId,
        mediaType: "movie",
        streams,
      },
    });
  } catch (err: any) {
    console.error(`[Stream Resolver Error on Movie ${tmdbId}]:`, err);
    return NextResponse.json(
      { ok: false, error: { code: "RESOLVER_ERROR", message: "Failed to resolve stream options" } },
      { status: 500 }
    );
  }
}
