import { NextResponse } from "next/server";
import { getAuthUserFromRequest } from "@/lib/auth";
import { getCollection, getMemoryCollection } from "@/lib/db";
import { UpdateUserStatusSchema } from "@/lib/validators";
import { User } from "@/types";
import { ObjectId } from "mongodb";

export async function GET(req: Request) {
  const authUser = await getAuthUserFromRequest(req);
  if (!authUser || authUser.role !== "admin") {
    return NextResponse.json({ ok: false, error: { code: "FORBIDDEN", message: "Admin privileges required" } }, { status: 403 });
  }

  const usersCol = await getCollection<User>("users");
  let users: any[] = [];

  if (usersCol) {
    users = await usersCol
      .find({}, { projection: { passwordHash: 0 } })
      .sort({ createdAt: -1 })
      .toArray();
  } else {
    const memory = getMemoryCollection<User>("users");
    users = memory.map(({ passwordHash, ...rest }) => rest);
  }

  return NextResponse.json({ ok: true, data: { users } });
}

export async function PATCH(req: Request) {
  const authUser = await getAuthUserFromRequest(req);
  if (!authUser || authUser.role !== "admin") {
    return NextResponse.json({ ok: false, error: { code: "FORBIDDEN", message: "Admin privileges required" } }, { status: 403 });
  }

  const body = await req.json();
  const { userId, isDisabled } = body;

  const validated = UpdateUserStatusSchema.safeParse({ isDisabled });
  if (!validated.success || !userId) {
    return NextResponse.json({ ok: false, error: { code: "VALIDATION_ERROR", message: "Invalid parameters" } }, { status: 400 });
  }

  const usersCol = await getCollection<User>("users");
  if (usersCol) {
    try {
      await usersCol.updateOne({ _id: new ObjectId(userId) as any }, { $set: { isDisabled: validated.data.isDisabled } });
    } catch {}
  } else {
    const memory = getMemoryCollection<User>("users");
    const user = memory.find((u) => u._id === userId);
    if (user) {
      user.isDisabled = validated.data.isDisabled;
    }
  }

  return NextResponse.json({ ok: true, data: { message: "User status updated" } });
}
