import { NextResponse } from "next/server";
import { getAuthUserFromRequest } from "@/lib/auth";
import { getCollection, getMemoryCollection } from "@/lib/db";
import { UpdatePreferencesSchema } from "@/lib/validators";
import { User } from "@/types";
import { ObjectId } from "mongodb";

export async function GET(req: Request) {
  const authUser = await getAuthUserFromRequest(req);
  if (!authUser) {
    return NextResponse.json({ ok: false, data: null });
  }

  const usersCol = await getCollection<User>("users");
  let user: User | null = null;

  if (usersCol) {
    try {
      const found = await usersCol.findOne({ _id: new ObjectId(authUser.userId) as any });
      user = found as any;
    } catch {}
  } else {
    const memoryUsers = getMemoryCollection<User>("users");
    user = memoryUsers.find((u) => u._id === authUser.userId) || null;
  }

  if (!user) {
    return NextResponse.json({ ok: false, data: null });
  }

  return NextResponse.json({
    ok: true,
    data: {
      userId: authUser.userId,
      email: user.email,
      username: user.username,
      role: user.role,
      preferences: user.preferences,
      simklConnected: !!user.simklToken?.accessToken,
      createdAt: user.createdAt,
    },
  });
}

export async function PATCH(req: Request) {
  const authUser = await getAuthUserFromRequest(req);
  if (!authUser) {
    return NextResponse.json({ ok: false, error: { code: "UNAUTHORIZED", message: "Not authenticated" } }, { status: 401 });
  }

  const body = await req.json();
  const validated = UpdatePreferencesSchema.safeParse(body);
  if (!validated.success) {
    return NextResponse.json({ ok: false, error: { code: "VALIDATION_ERROR", message: validated.error.issues[0].message } }, { status: 400 });
  }

  const usersCol = await getCollection<User>("users");
  if (usersCol) {
    await usersCol.updateOne(
      { _id: new ObjectId(authUser.userId) as any },
      {
        $set: {
          ...(validated.data.defaultSubtitleLang && { "preferences.defaultSubtitleLang": validated.data.defaultSubtitleLang }),
          ...(validated.data.autoPlayNext !== undefined && { "preferences.autoPlayNext": validated.data.autoPlayNext }),
          ...(validated.data.theme && { "preferences.theme": validated.data.theme }),
        },
      }
    );
  } else {
    const memoryUsers = getMemoryCollection<User>("users");
    const user = memoryUsers.find((u) => u._id === authUser.userId);
    if (user) {
      user.preferences = { ...user.preferences, ...validated.data };
    }
  }

  return NextResponse.json({
    ok: true,
    data: { message: "Preferences updated successfully." },
  });
}
