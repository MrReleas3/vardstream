import { NextResponse } from "next/server";
import { getFranchiseRelations } from "@/lib/tmdb";

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
    const relations = await getFranchiseRelations(tmdbId, "movie");
    return NextResponse.json(
      { ok: true, data: { relations } },
      { headers: { "Cache-Control": "public, s-maxage=43200, stale-while-revalidate=86400" } }
    );
  } catch (err: any) {
    console.error(`[Movie Relations Error on ${tmdbId}]:`, err);
    return NextResponse.json(
      { ok: false, error: { code: "FETCH_ERROR", message: "Failed to fetch franchise relations" } },
      { status: 500 }
    );
  }
}
