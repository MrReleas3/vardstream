import { NextResponse } from "next/server";
import { LoginSchema } from "@/lib/validators";
import { getCollection, getMemoryCollection } from "@/lib/db";
import { verifyPassword, signAccessToken, signRefreshToken, setAuthCookies } from "@/lib/auth";
import { checkRateLimit } from "@/lib/rate-limit";
import { User } from "@/types";
import { ObjectId } from "mongodb";

export async function POST(req: Request) {
  try {
    const ip = req.headers.get("x-forwarded-for") || "127.0.0.1";
    const rl = await checkRateLimit(`auth:login:${ip}`, 10, 900);
    if (!rl.success) {
      return NextResponse.json(
        { ok: false, error: { code: "RATE_LIMITED", message: "Too many login attempts. Please try again in 15 minutes." } },
        { status: 429 }
      );
    }

    const body = await req.json();
    const validated = LoginSchema.safeParse(body);

    if (!validated.success) {
      return NextResponse.json(
        { ok: false, error: { code: "VALIDATION_ERROR", message: validated.error.issues[0].message } },
        { status: 400 }
      );
    }

    const { emailOrUsername, password } = validated.data;
    const query = emailOrUsername.toLowerCase().trim();

    // Development-only escape hatch for preview testing. It still issues the
    // normal signed cookies, so protected pages and watchlist APIs behave normally.
    const isDevTestUser =
      process.env.NODE_ENV !== "production" &&
      query === "demo@vardsrm.local" &&
      password === "retro2026";

    if (isDevTestUser) {
      const sessionUser = {
        userId: "dev-test-user",
        email: "demo@vardsrm.local",
        username: "retro_demo",
        role: "user" as const,
      };
      const accessToken = await signAccessToken(sessionUser);
      const refreshToken = await signRefreshToken(sessionUser.userId);
      await setAuthCookies(accessToken, refreshToken);

      return NextResponse.json({
        ok: true,
        data: { user: sessionUser, accessToken },
      });
    }

    const usersCol = await getCollection<User>("users");
    let user: User | null = null;
    let userIdStr = "";

    if (usersCol) {
      const found = await usersCol.findOne({
        $or: [{ email: query }, { username: query }],
      });
      if (found) {
        user = found as any;
        userIdStr = found._id ? found._id.toString() : "";
      }
    } else {
      const memoryUsers = getMemoryCollection<User>("users");
      const found = memoryUsers.find(
        (u) => u.email.toLowerCase() === query || u.username.toLowerCase() === query
      );
      if (found) {
        user = found;
        userIdStr = found._id || "admin-root-id";
      }
    }

    if (!user) {
      return NextResponse.json(
        { ok: false, error: { code: "INVALID_CREDENTIALS", message: "Invalid email/username or password." } },
        { status: 401 }
      );
    }

    if (user.isDisabled) {
      return NextResponse.json(
        { ok: false, error: { code: "ACCOUNT_DISABLED", message: "Your account has been suspended by an administrator." } },
        { status: 403 }
      );
    }

    const passwordMatch = await verifyPassword(password, user.passwordHash);
    if (!passwordMatch) {
      return NextResponse.json(
        { ok: false, error: { code: "INVALID_CREDENTIALS", message: "Invalid email/username or password." } },
        { status: 401 }
      );
    }

    const sessionUser = {
      userId: userIdStr,
      email: user.email,
      username: user.username,
      role: user.role,
    };

    const accessToken = await signAccessToken(sessionUser);
    const refreshToken = await signRefreshToken(userIdStr);
    await setAuthCookies(accessToken, refreshToken);

    // Update lastActiveAt
    if (usersCol) {
      await usersCol.updateOne({ _id: new ObjectId(userIdStr) as any }, { $set: { lastActiveAt: new Date().toISOString() } });
    } else {
      user.lastActiveAt = new Date().toISOString();
    }

    return NextResponse.json({
      ok: true,
      data: {
        user: sessionUser,
        accessToken,
      },
    });
  } catch (err: any) {
    console.error("[Login API Error]:", err);
    return NextResponse.json(
      { ok: false, error: { code: "INTERNAL_ERROR", message: "An error occurred during login." } },
      { status: 500 }
    );
  }
}
