import { NextResponse } from "next/server";
import { getCollection, getMemoryCollection } from "@/lib/db";
import { ForgotPasswordSchema } from "@/lib/validators";
import { sendPasswordResetEmail } from "@/lib/email";
import { checkRateLimit } from "@/lib/rate-limit";
import { User, PasswordResetToken } from "@/types";
import crypto from "crypto";

export async function POST(req: Request) {
  try {
    const ip = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "127.0.0.1";
    const ipLimit = await checkRateLimit(`auth:forgot-pw:ip:${ip}`, 5, 900);
    if (!ipLimit.success) {
      return NextResponse.json(
        {
          ok: false,
          error: {
            code: "RATE_LIMITED",
            message: "Too many password reset requests from this IP. Please try again in 15 minutes.",
          },
        },
        { status: 429 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const validated = ForgotPasswordSchema.safeParse(body);

    if (!validated.success) {
      return NextResponse.json(
        { ok: false, error: { code: "VALIDATION_ERROR", message: validated.error.issues[0].message } },
        { status: 400 }
      );
    }

    const { email } = validated.data;
    const normalizedEmail = email.toLowerCase().trim();

    // Check per-target-email rate limit (max 3 reset emails per 15 minutes)
    const emailLimit = await checkRateLimit(`auth:forgot-pw:email:${normalizedEmail}`, 3, 900);
    if (!emailLimit.success) {
      // Return generic success without sending another email to protect SMTP provider quota and prevent inbox bombing
      return NextResponse.json({
        ok: true,
        data: {
          message: "If an account with that email exists, a password reset link has been dispatched.",
        },
      });
    }

    // Find user
    const usersCol = await getCollection<User>("users");
    let user: User | null = null;

    if (usersCol) {
      user = (await usersCol.findOne({ email: normalizedEmail })) as any;
    } else {
      const memoryUsers = getMemoryCollection<User>("users");
      user = memoryUsers.find((u) => u.email.toLowerCase() === normalizedEmail) || null;
    }

    // Always respond with success to prevent email enumeration
    if (user && user._id) {
      const token = crypto.randomBytes(32).toString("hex");
      const expiresAt = new Date(Date.now() + 3600 * 1000).toISOString(); // 1 hour validity
      const now = new Date().toISOString();

      const resetRecord: PasswordResetToken = {
        userId: user._id.toString(),
        email: user.email,
        token,
        expiresAt,
        used: false,
        createdAt: now,
      };

      const resetsCol = await getCollection<PasswordResetToken>("password_resets");
      if (resetsCol) {
        await resetsCol.insertOne(resetRecord as any);
      } else {
        const memoryResets = getMemoryCollection<PasswordResetToken>("password_resets");
        memoryResets.push({ ...resetRecord, _id: `reset-${Date.now()}` });
      }

      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
      const resetUrl = `${baseUrl}/reset-password?token=${token}`;

      await sendPasswordResetEmail(user.email, resetUrl, user.username);
    }

    return NextResponse.json({
      ok: true,
      data: {
        message: "If an account with that email exists, a password reset link has been dispatched.",
      },
    });
  } catch (err: any) {
    console.error("[Forgot Password API Error]:", err);
    return NextResponse.json(
      { ok: false, error: { code: "SERVER_ERROR", message: "Failed to process request." } },
      { status: 500 }
    );
  }
}
