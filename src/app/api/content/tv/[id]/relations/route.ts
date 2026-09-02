import { NextResponse } from "next/server";
import { getFranchiseRelations } from "@/lib/tmdb";

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
    const relations = await getFranchiseRelations(tmdbId, "tv");
    return NextResponse.json({ ok: true, data: { relations } });
  } catch (err: any) {
    console.error(`[TV Relations Error on ${tmdbId}]:`, err);
    return NextResponse.json(
      { ok: false, error: { code: "FETCH_ERROR", message: "Failed to fetch franchise relations" } },
      { status: 500 }
    );
  }
}
