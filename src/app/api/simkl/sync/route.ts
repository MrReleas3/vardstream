import { NextResponse } from "next/server";
import { getAuthUserFromRequest } from "@/lib/auth";
import { getCollection, getMemoryCollection } from "@/lib/db";
import { importFromSimkl, exportToSimkl } from "@/lib/simkl";
import { User, UserActivity } from "@/types";
import { ObjectId } from "mongodb";

export async function POST(req: Request) {
  const authUser = await getAuthUserFromRequest(req);
  if (!authUser) {
    return NextResponse.json({ ok: false, error: { code: "UNAUTHORIZED", message: "Not authenticated" } }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const action = body.action; // "import" | "export"

  if (action !== "import" && action !== "export") {
    return NextResponse.json(
      { ok: false, error: { code: "INVALID_ACTION", message: "Action must be 'import' or 'export'" } },
      { status: 400 }
    );
  }

  // Get user's Simkl access token
  const usersCol = await getCollection<User>("users");
  let user: User | null = null;

  if (usersCol) {
    user = (await usersCol.findOne({ _id: new ObjectId(authUser.userId) as any })) as any;
  } else {
    const memory = getMemoryCollection<User>("users");
    user = memory.find((u) => u._id === authUser.userId) || null;
  }

  const token = user?.simklToken?.accessToken;
  if (!token) {
    return NextResponse.json(
      { ok: false, error: { code: "NO_SIMKL_TOKEN", message: "Simkl account is not connected. Please connect Simkl first." } },
      { status: 400 }
    );
  }

  const activitiesCol = await getCollection<UserActivity>("user_activities");

  try {
    if (action === "import") {
      const { items, moviesCount, showsCount } = await importFromSimkl(token);

      if (items.length > 0) {
        if (activitiesCol) {
          for (const item of items) {
            await activitiesCol.updateOne(
              { userId: authUser.userId, mediaId: item.mediaId, mediaType: item.mediaType },
              { $set: { ...item, userId: authUser.userId } },
              { upsert: true }
            );
          }
        } else {
          const memory = getMemoryCollection<UserActivity>("user_activities");
          for (const item of items) {
            const idx = memory.findIndex(
              (a) => a.userId === authUser.userId && a.mediaId === item.mediaId && a.mediaType === item.mediaType
            );
            if (idx !== -1) {
              memory[idx] = { ...memory[idx], ...item };
            } else {
              memory.push({ ...item, _id: `act-${Date.now()}-${item.mediaId}`, userId: authUser.userId });
            }
          }
        }
      }

      return NextResponse.json({
        ok: true,
        data: {
          message: `Imported ${items.length} titles (${moviesCount} movies, ${showsCount} shows) from Simkl successfully.`,
          importedCount: items.length,
        },
      });
    } else {
      // Export to Simkl
      let localActivities: UserActivity[] = [];
      if (activitiesCol) {
        localActivities = (await activitiesCol.find({ userId: authUser.userId }).toArray()) as any;
      } else {
        const memory = getMemoryCollection<UserActivity>("user_activities");
        localActivities = memory.filter((a) => a.userId === authUser.userId);
      }

      const result = await exportToSimkl(token, localActivities);

      return NextResponse.json({
        ok: true,
        data: {
          message: `Exported ${result.exportedCount} titles to Simkl successfully.`,
          exportedCount: result.exportedCount,
        },
      });
    }
  } catch (err: any) {
    console.error("[Simkl Sync API Error]:", err);
    return NextResponse.json(
      { ok: false, error: { code: "SIMKL_SYNC_ERROR", message: err.message || "Simkl sync failed." } },
      { status: 500 }
    );
  }
}
