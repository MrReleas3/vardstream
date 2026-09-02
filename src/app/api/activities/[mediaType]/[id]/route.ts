import { NextResponse } from "next/server";
import { getAuthUserFromRequest } from "@/lib/auth";
import { getCollection, getMemoryCollection } from "@/lib/db";
import { UpsertActivitySchema } from "@/lib/validators";
import { syncActivityToSimkl } from "@/lib/simkl";
import { MediaType, User, UserActivity } from "@/types";
import { ObjectId } from "mongodb";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ mediaType: string; id: string }> }
) {
  const authUser = await getAuthUserFromRequest(req);
  if (!authUser) {
    return NextResponse.json({ ok: false, error: { code: "UNAUTHORIZED", message: "Not authenticated" } }, { status: 401 });
  }

  const { mediaType, id } = await params;
  const tmdbId = parseInt(id, 10);
  const type = mediaType as MediaType;

  if (isNaN(tmdbId) || (type !== "movie" && type !== "tv")) {
    return NextResponse.json({ ok: false, error: { code: "INVALID_PARAMS", message: "Invalid media type or ID" } }, { status: 400 });
  }

  const activitiesCol = await getCollection<UserActivity>("user_activities");
  let activity: UserActivity | null = null;

  if (activitiesCol) {
    activity = (await activitiesCol.findOne({
      userId: authUser.userId,
      mediaId: tmdbId,
      mediaType: type,
    })) as any;
  } else {
    const memoryActivities = getMemoryCollection<UserActivity>("user_activities");
    activity =
      memoryActivities.find(
        (a) => a.userId === authUser.userId && a.mediaId === tmdbId && a.mediaType === type
      ) || null;
  }

  return NextResponse.json({ ok: true, data: { activity } });
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ mediaType: string; id: string }> }
) {
  const authUser = await getAuthUserFromRequest(req);
  if (!authUser) {
    return NextResponse.json({ ok: false, error: { code: "UNAUTHORIZED", message: "Not authenticated" } }, { status: 401 });
  }

  const { mediaType, id } = await params;
  const tmdbId = parseInt(id, 10);
  const type = mediaType as MediaType;

  if (isNaN(tmdbId) || (type !== "movie" && type !== "tv")) {
    return NextResponse.json({ ok: false, error: { code: "INVALID_PARAMS", message: "Invalid media type or ID" } }, { status: 400 });
  }

  const body = await req.json();
  const validated = UpsertActivitySchema.safeParse(body);
  if (!validated.success) {
    return NextResponse.json({ ok: false, error: { code: "VALIDATION_ERROR", message: validated.error.issues[0].message } }, { status: 400 });
  }

  const { status, isFavorite, rating, progress } = validated.data;
  const now = new Date().toISOString();

  // Determine auto-status from playback progress: Only promote to 'watching' if 50% is watched
  let resolvedStatus = status;
  if (!resolvedStatus && progress) {
    const dur = progress.durationSeconds || (type === "tv" ? 1500 : 5400);
    if (dur > 0 && progress.timestampSeconds >= dur * 0.95) {
      resolvedStatus = "completed";
    } else if (dur > 0 && progress.timestampSeconds >= dur * 0.5) {
      resolvedStatus = "watching";
    }
  }

  const activitiesCol = await getCollection<UserActivity>("user_activities");

  if (activitiesCol) {
    await activitiesCol.updateOne(
      { userId: authUser.userId, mediaId: tmdbId, mediaType: type },
      {
        $set: {
          ...(resolvedStatus && { status: resolvedStatus }),
          ...(isFavorite !== undefined && { isFavorite }),
          ...(rating !== undefined && { rating }),
          ...(progress && { progress }),
          ...(body.title && { title: body.title }),
          ...(body.posterPath !== undefined && { posterPath: body.posterPath }),
          ...(body.backdropPath !== undefined && { backdropPath: body.backdropPath }),
          updatedAt: now,
        },
        $setOnInsert: {
          userId: authUser.userId,
          mediaId: tmdbId,
          mediaType: type,
          status: resolvedStatus || "plan_to_watch",
          createdAt: now,
        },
      },
      { upsert: true }
    );
  } else {
    const memoryActivities = getMemoryCollection<UserActivity>("user_activities");
    const existing = memoryActivities.find(
      (a) => a.userId === authUser.userId && a.mediaId === tmdbId && a.mediaType === type
    );

    if (existing) {
      if (resolvedStatus) existing.status = resolvedStatus;
      if (isFavorite !== undefined) existing.isFavorite = isFavorite;
      if (rating !== undefined) existing.rating = rating;
      if (progress) existing.progress = { ...existing.progress, ...progress };
      if (body.title) existing.title = body.title;
      if (body.posterPath !== undefined) existing.posterPath = body.posterPath;
      if (body.backdropPath !== undefined) existing.backdropPath = body.backdropPath;
      existing.updatedAt = now;
    } else {
      memoryActivities.push({
        _id: `activity-${Date.now()}`,
        userId: authUser.userId,
        mediaId: tmdbId,
        mediaType: type,
        status: resolvedStatus || "plan_to_watch",
        isFavorite: isFavorite || false,
        rating: rating || null,
        progress: progress || { timestampSeconds: 0 },
        title: body.title,
        posterPath: body.posterPath,
        backdropPath: body.backdropPath,
        updatedAt: now,
        createdAt: now,
      });
    }
  }

  // Trigger fire-and-forget Simkl sync if user has token
  const usersCol = await getCollection<User>("users");
  if (usersCol) {
    try {
      const user = await usersCol.findOne({ _id: new ObjectId(authUser.userId) as any });
      if (user?.simklToken?.accessToken) {
        syncActivityToSimkl(
          user.simklToken.accessToken,
          type,
          tmdbId,
          status || "watching",
          progress?.lastSeason,
          progress?.lastEpisode
        );
      }
    } catch {}
  }

  return NextResponse.json({ ok: true, data: { message: "Activity updated successfully" } });
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ mediaType: string; id: string }> }
) {
  const authUser = await getAuthUserFromRequest(req);
  if (!authUser) {
    return NextResponse.json({ ok: false, error: { code: "UNAUTHORIZED", message: "Not authenticated" } }, { status: 401 });
  }

  const { mediaType, id } = await params;
  const tmdbId = parseInt(id, 10);
  const type = mediaType as MediaType;

  const activitiesCol = await getCollection<UserActivity>("user_activities");
  if (activitiesCol) {
    await activitiesCol.deleteOne({ userId: authUser.userId, mediaId: tmdbId, mediaType: type });
  } else {
    const memory = getMemoryCollection<UserActivity>("user_activities");
    const idx = memory.findIndex(
      (a) => a.userId === authUser.userId && a.mediaId === tmdbId && a.mediaType === type
    );
    if (idx !== -1) memory.splice(idx, 1);
  }

  return NextResponse.json({ ok: true, data: { message: "Activity removed successfully" } });
}
