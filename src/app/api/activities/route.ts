import { NextResponse } from "next/server";
import { getAuthUserFromRequest } from "@/lib/auth";
import { getCollection, getMemoryCollection } from "@/lib/db";
import { UserActivity } from "@/types";

export async function GET(req: Request) {
  const authUser = await getAuthUserFromRequest(req);
  if (!authUser) {
    return NextResponse.json({ ok: false, error: { code: "UNAUTHORIZED", message: "Not authenticated" } }, { status: 401 });
  }

  const url = new URL(req.url);
  const status = url.searchParams.get("status"); // 'plan_to_watch', 'watching', 'completed', 'dropped'
  const isFavorite = url.searchParams.get("favorite") === "true";

  const activitiesCol = await getCollection<UserActivity>("user_activities");
  let items: UserActivity[] = [];

  if (activitiesCol) {
    const filter: any = { userId: authUser.userId };
    if (status) filter.status = status;
    if (isFavorite) filter.isFavorite = true;

    items = (await activitiesCol.find(filter).sort({ updatedAt: -1 }).toArray()) as any;
  } else {
    const memoryActivities = getMemoryCollection<UserActivity>("user_activities");
    items = memoryActivities.filter((a) => {
      if (a.userId !== authUser.userId) return false;
      if (status && a.status !== status) return false;
      if (isFavorite && !a.isFavorite) return false;
      return true;
    }).sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }

  return NextResponse.json({ ok: true, data: { activities: items } });
}
