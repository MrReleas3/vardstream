import { NextResponse } from "next/server";
import { searchMedia } from "@/lib/tmdb";
import { MediaType } from "@/types";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const q = url.searchParams.get("q") || "";
  const type = (url.searchParams.get("type") as "all" | MediaType) || "all";

  if (!q.trim()) {
    return NextResponse.json({ ok: true, data: { results: [] } });
  }

  try {
    const results = await searchMedia(q.trim(), type);
    return NextResponse.json({ ok: true, data: { results } });
  } catch (err: any) {
    console.error("[Search Error]:", err);
    return NextResponse.json(
      { ok: false, error: { code: "SEARCH_FAILED", message: "Failed to search content" } },
      { status: 500 }
    );
  }
}
