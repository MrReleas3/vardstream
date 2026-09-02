import { NextResponse } from "next/server";
import { getAuthUserFromRequest } from "@/lib/auth";
import { getCollection, getMemoryCollection } from "@/lib/db";
import { UserActivity } from "@/types";

function isHalfWatched(a: UserActivity): boolean {
  if (!a.progress) return false;
  const ts = a.progress.timestampSeconds || 0;
  const dur = a.progress.durationSeconds || 0;

  if (dur > 0) {
    // Only include if watched at least 50% and less than 95% (not finished)
    return ts >= dur * 0.5 && ts < dur * 0.95;
  }

  // Fallback if duration is unspecified: at least 10 mins for TV, 30 mins for Movie (approx half duration)
  const fallbackHalf = a.mediaType === "tv" ? 600 : 1800;
  return ts >= fallbackHalf;
}

export async function GET(req: Request) {
  const authUser = await getAuthUserFromRequest(req);
  if (!authUser) {
    return NextResponse.json({ ok: false, error: { code: "UNAUTHORIZED", message: "Not authenticated" } }, { status: 401 });
  }

  const activitiesCol = await getCollection<UserActivity>("user_activities");
  let items: UserActivity[] = [];

  if (activitiesCol) {
    const rawItems = (await activitiesCol
      .find({
        userId: authUser.userId,
        status: "watching",
      })
      .sort({ updatedAt: -1 })
      .limit(20)
      .toArray()) as any;

    items = rawItems.filter(isHalfWatched).slice(0, 10);
  } else {
    const memoryActivities = getMemoryCollection<UserActivity>("user_activities");
    items = memoryActivities
      .filter((a) => a.userId === authUser.userId && a.status === "watching" && isHalfWatched(a))
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      .slice(0, 10);
  }

  return NextResponse.json({ ok: true, data: { continueWatching: items } });
}
