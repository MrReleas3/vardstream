import { NextResponse } from "next/server";
import { exchangeSimklCode } from "@/lib/simkl";
import { getAuthUserFromRequest } from "@/lib/auth";
import { getCollection, getMemoryCollection } from "@/lib/db";
import { User } from "@/types";
import { ObjectId } from "mongodb";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const authUser = await getAuthUserFromRequest(req);

  if (!code || !authUser) {
    return NextResponse.redirect(new URL("/settings?simkl=error", req.url));
  }

  const tokenData = await exchangeSimklCode(code);
  if (!tokenData) {
    return NextResponse.redirect(new URL("/settings?simkl=failed", req.url));
  }

  const usersCol = await getCollection<User>("users");
  if (usersCol) {
    await usersCol.updateOne(
      { _id: new ObjectId(authUser.userId) as any },
      { $set: { simklToken: { accessToken: tokenData.accessToken, expiresAt: new Date(Date.now() + 30 * 86400 * 1000).toISOString() } } }
    );
  } else {
    const memoryUsers = getMemoryCollection<User>("users");
    const user = memoryUsers.find((u) => u._id === authUser.userId);
    if (user) {
      user.simklToken = { accessToken: tokenData.accessToken, expiresAt: new Date().toISOString() };
    }
  }

  return NextResponse.redirect(new URL("/settings?simkl=connected", req.url));
}
