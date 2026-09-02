import { NextResponse } from "next/server";
import { getCollection, getMemoryCollection } from "@/lib/db";
import { hashPassword } from "@/lib/auth";
import { ResetPasswordSchema } from "@/lib/validators";
import { User, PasswordResetToken } from "@/types";
import { ObjectId } from "mongodb";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const validated = ResetPasswordSchema.safeParse(body);

    if (!validated.success) {
      return NextResponse.json(
        { ok: false, error: { code: "VALIDATION_ERROR", message: validated.error.issues[0].message } },
        { status: 400 }
      );
    }

    const { token, password } = validated.data;
    const now = new Date().toISOString();

    const resetsCol = await getCollection<PasswordResetToken>("password_resets");
    let resetRecord: PasswordResetToken | null = null;

    if (resetsCol) {
      resetRecord = (await resetsCol.findOne({
        token,
        used: false,
        expiresAt: { $gt: now },
      })) as any;
    } else {
      const memoryResets = getMemoryCollection<PasswordResetToken>("password_resets");
      resetRecord =
        memoryResets.find(
          (r) => r.token === token && !r.used && new Date(r.expiresAt).getTime() > Date.now()
        ) || null;
    }

    if (!resetRecord) {
      return NextResponse.json(
        {
          ok: false,
          error: {
            code: "INVALID_TOKEN",
            message: "The password reset link is invalid or has expired. Please request a new one.",
          },
        },
        { status: 400 }
      );
    }

    const newPasswordHash = await hashPassword(password);

    // Update user password
    const usersCol = await getCollection<User>("users");
    if (usersCol) {
      try {
        await usersCol.updateOne(
          { _id: new ObjectId(resetRecord.userId) as any },
          { $set: { passwordHash: newPasswordHash } }
        );
      } catch {
        await usersCol.updateOne(
          { email: resetRecord.email },
          { $set: { passwordHash: newPasswordHash } }
        );
      }
      await resetsCol!.updateOne({ token }, { $set: { used: true } });
    } else {
      const memoryUsers = getMemoryCollection<User>("users");
      const user = memoryUsers.find((u) => u._id === resetRecord!.userId || u.email === resetRecord!.email);
      if (user) {
        user.passwordHash = newPasswordHash;
      }
      resetRecord.used = true;
    }

    return NextResponse.json({
      ok: true,
      data: {
        message: "Your password has been successfully reset. You can now log in with your new password.",
      },
    });
  } catch (err: any) {
    console.error("[Reset Password API Error]:", err);
    return NextResponse.json(
      { ok: false, error: { code: "SERVER_ERROR", message: "Failed to reset password." } },
      { status: 500 }
    );
  }
}
