import { NextResponse } from "next/server";
import { RegisterSchema } from "@/lib/validators";
import { getCollection, getMemoryCollection } from "@/lib/db";
import { hashPassword, setAuthCookies, signAccessToken, signRefreshToken } from "@/lib/auth";
import { checkRateLimit } from "@/lib/rate-limit";
import { InviteCode, User } from "@/types";

export async function POST(req: Request) {
  try {
    const ip = req.headers.get("x-forwarded-for") || "127.0.0.1";
    const rl = await checkRateLimit(`auth:register:${ip}`, 5, 3600);
    if (!rl.success) {
      return NextResponse.json(
        { ok: false, error: { code: "RATE_LIMITED", message: "Too many registration attempts. Please try again later." } },
        { status: 429 }
      );
    }

    const body = await req.json();
    const validated = RegisterSchema.safeParse(body);

    if (!validated.success) {
      return NextResponse.json(
        { ok: false, error: { code: "VALIDATION_ERROR", message: validated.error.issues[0].message } },
        { status: 400 }
      );
    }

    const { email, username, password, inviteCode } = validated.data;

    // 1. Verify invite code
    const invitesCol = await getCollection<InviteCode>("invite_codes");
    let validInvite: InviteCode | null = null;

    if (invitesCol) {
      validInvite = await invitesCol.findOne({ code: inviteCode.trim(), status: "active" });
    } else {
      const memoryInvites = getMemoryCollection<InviteCode>("invite_codes");
      validInvite = memoryInvites.find((i) => i.code === inviteCode.trim() && i.status === "active") || null;
    }

    if (!validInvite) {
      return NextResponse.json(
        { ok: false, error: { code: "INVALID_INVITE", message: "Invalid or expired invite code." } },
        { status: 400 }
      );
    }

    // 2. Check if user already exists
    const usersCol = await getCollection<User>("users");
    if (usersCol) {
      const existing = await usersCol.findOne({
        $or: [{ email: email.toLowerCase() }, { username: username.toLowerCase() }],
      });
      if (existing) {
        return NextResponse.json(
          { ok: false, error: { code: "USER_EXISTS", message: "An account with this email or username already exists." } },
          { status: 409 }
        );
      }
    } else {
      const memoryUsers = getMemoryCollection<User>("users");
      const existing = memoryUsers.find(
        (u) => u.email.toLowerCase() === email.toLowerCase() || u.username.toLowerCase() === username.toLowerCase()
      );
      if (existing) {
        return NextResponse.json(
          { ok: false, error: { code: "USER_EXISTS", message: "An account with this email or username already exists." } },
          { status: 409 }
        );
      }
    }

    // 3. Hash password and create user
    const passwordHash = await hashPassword(password);
    const newUser: User = {
      email: email.toLowerCase(),
      username: username.toLowerCase(),
      passwordHash,
      role: "user",
      inviteCodeUsed: inviteCode.trim(),
      preferences: {
        defaultSubtitleLang: "en",
        autoPlayNext: true,
        theme: "dark",
      },
      isDisabled: false,
      createdAt: new Date().toISOString(),
    };

    let userId = "";

    if (usersCol) {
      const insertResult = await usersCol.insertOne(newUser as any);
      userId = insertResult.insertedId.toString();
      // Mark invite code as used
      await invitesCol?.updateOne(
        { code: inviteCode.trim() },
        { $set: { status: "used", usedBy: insertResult.insertedId as any, usedAt: new Date().toISOString() } }
      );
    } else {
      const memoryUsers = getMemoryCollection<User>("users");
      userId = `user-${Date.now()}`;
      newUser._id = userId;
      memoryUsers.push(newUser);

      validInvite.status = "used";
      validInvite.usedBy = userId;
      validInvite.usedAt = new Date().toISOString();
    }

    // 4. Issue tokens
    const sessionUser = {
      userId,
      email: newUser.email,
      username: newUser.username,
      role: newUser.role,
    };

    const accessToken = await signAccessToken(sessionUser);
    const refreshToken = await signRefreshToken(userId);
    await setAuthCookies(accessToken, refreshToken);

    return NextResponse.json({
      ok: true,
      data: {
        user: sessionUser,
        accessToken,
      },
    });
  } catch (err: any) {
    console.error("[Register API Error]:", err);
    return NextResponse.json(
      { ok: false, error: { code: "INTERNAL_ERROR", message: "An error occurred during registration." } },
      { status: 500 }
    );
  }
}
