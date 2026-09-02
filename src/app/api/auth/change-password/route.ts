import { NextResponse } from "next/server";
import { getAuthUserFromRequest, verifyPassword, hashPassword } from "@/lib/auth";
import { getCollection, getMemoryCollection } from "@/lib/db";
import { checkRateLimit } from "@/lib/rate-limit";
import { ChangePasswordSchema } from "@/lib/validators";
import { User } from "@/types";
import { ObjectId } from "mongodb";

export async function POST(req: Request) {
  const authUser = await getAuthUserFromRequest(req);
  if (!authUser) {
    return NextResponse.json(
      { ok: false, error: { code: "UNAUTHORIZED", message: "Authentication required." } },
      { status: 401 }
    );
  }

  const userLimit = await checkRateLimit(`auth:change-pw:${authUser.userId}`, 10, 900);
  if (!userLimit.success) {
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: "RATE_LIMITED",
          message: "Too many password change attempts. Please try again in 15 minutes.",
        },
      },
      { status: 429 }
    );
  }

  try {
    const body = await req.json().catch(() => ({}));
    const validated = ChangePasswordSchema.safeParse(body);

    if (!validated.success) {
      return NextResponse.json(
        { ok: false, error: { code: "VALIDATION_ERROR", message: validated.error.issues[0].message } },
        { status: 400 }
      );
    }

    const { currentPassword, newPassword } = validated.data;

    // Find user
    const usersCol = await getCollection<User>("users");
    let user: User | null = null;

    if (usersCol) {
      try {
        user = (await usersCol.findOne({ _id: new ObjectId(authUser.userId) as any })) as any;
      } catch {
        user = (await usersCol.findOne({ _id: authUser.userId as any })) as any;
      }
    } else {
      const memoryUsers = getMemoryCollection<User>("users");
      user = memoryUsers.find((u) => u._id === authUser.userId) || null;
    }

    if (!user) {
      return NextResponse.json(
        { ok: false, error: { code: "USER_NOT_FOUND", message: "User account not found." } },
        { status: 404 }
      );
    }

    // Verify current password
    const isCurrentValid = await verifyPassword(currentPassword, user.passwordHash);
    if (!isCurrentValid) {
      return NextResponse.json(
        { ok: false, error: { code: "INCORRECT_PASSWORD", message: "Current password is incorrect." } },
        { status: 400 }
      );
    }

    // Hash new password
    const newPasswordHash = await hashPassword(newPassword);

    if (usersCol) {
      try {
        await usersCol.updateOne(
          { _id: new ObjectId(authUser.userId) as any },
          { $set: { passwordHash: newPasswordHash } }
        );
      } catch {
        await usersCol.updateOne(
          { _id: authUser.userId as any },
          { $set: { passwordHash: newPasswordHash } }
        );
      }
    } else {
      user.passwordHash = newPasswordHash;
    }

    return NextResponse.json({
      ok: true,
      data: {
        message: "Your password has been changed successfully.",
      },
    });
  } catch (err: any) {
    console.error("[Change Password API Error]:", err);
    return NextResponse.json(
      { ok: false, error: { code: "SERVER_ERROR", message: "Failed to update password." } },
      { status: 500 }
    );
  }
}
