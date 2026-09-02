import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyRefreshToken, signAccessToken, signRefreshToken, setAuthCookies } from "@/lib/auth";
import { getCollection, getMemoryCollection } from "@/lib/db";
import { User } from "@/types";
import { ObjectId } from "mongodb";

export async function POST() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("refreshToken")?.value;

    if (!token) {
      return NextResponse.json(
        { ok: false, error: { code: "UNAUTHORIZED", message: "No refresh token provided." } },
        { status: 401 }
      );
    }

    const payload = await verifyRefreshToken(token);
    if (!payload) {
      return NextResponse.json(
        { ok: false, error: { code: "UNAUTHORIZED", message: "Invalid or expired refresh token." } },
        { status: 401 }
      );
    }

    const usersCol = await getCollection<User>("users");
    let user: User | null = null;

    if (usersCol) {
      try {
        const found = await usersCol.findOne({ _id: new ObjectId(payload.userId) as any });
        user = found as any;
      } catch {
        // ID format check
      }
    } else {
      const memoryUsers = getMemoryCollection<User>("users");
      user = memoryUsers.find((u) => u._id === payload.userId) || null;
    }

    if (!user || user.isDisabled) {
      return NextResponse.json(
        { ok: false, error: { code: "UNAUTHORIZED", message: "User account not active." } },
        { status: 401 }
      );
    }

    const sessionUser = {
      userId: payload.userId,
      email: user.email,
      username: user.username,
      role: user.role,
    };

    const newAccessToken = await signAccessToken(sessionUser);
    const newRefreshToken = await signRefreshToken(payload.userId);
    await setAuthCookies(newAccessToken, newRefreshToken);

    return NextResponse.json({
      ok: true,
      data: {
        user: sessionUser,
        accessToken: newAccessToken,
      },
    });
  } catch (err: any) {
    console.error("[Refresh API Error]:", err);
    return NextResponse.json(
      { ok: false, error: { code: "INTERNAL_ERROR", message: "Token refresh failed." } },
      { status: 500 }
    );
  }
}
