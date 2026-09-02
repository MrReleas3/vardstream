import { NextResponse } from "next/server";
import { getAuthUserFromRequest } from "@/lib/auth";
import { getCollection, getMemoryCollection } from "@/lib/db";
import { CreateInviteCodesSchema } from "@/lib/validators";
import { InviteCode } from "@/types";
import crypto from "crypto";

function generateCode(): string {
  return crypto.randomBytes(4).toString("hex").toUpperCase();
}

export async function GET(req: Request) {
  const authUser = await getAuthUserFromRequest(req);
  if (!authUser || authUser.role !== "admin") {
    return NextResponse.json({ ok: false, error: { code: "FORBIDDEN", message: "Admin privileges required" } }, { status: 403 });
  }

  const invitesCol = await getCollection<InviteCode>("invite_codes");
  let codes: InviteCode[] = [];

  if (invitesCol) {
    codes = (await invitesCol.find({}).sort({ createdAt: -1 }).toArray()) as any;
  } else {
    codes = getMemoryCollection<InviteCode>("invite_codes").slice().reverse();
  }

  return NextResponse.json({ ok: true, data: { inviteCodes: codes } });
}

export async function POST(req: Request) {
  const authUser = await getAuthUserFromRequest(req);
  if (!authUser || authUser.role !== "admin") {
    return NextResponse.json({ ok: false, error: { code: "FORBIDDEN", message: "Admin privileges required" } }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const validated = CreateInviteCodesSchema.safeParse(body);
  if (!validated.success) {
    return NextResponse.json({ ok: false, error: { code: "VALIDATION_ERROR", message: validated.error.issues[0].message } }, { status: 400 });
  }

  const { count, expiresInDays } = validated.data;
  const now = new Date();
  const expiresAt = expiresInDays ? new Date(now.getTime() + expiresInDays * 86400000).toISOString() : null;

  const newCodes: InviteCode[] = [];
  for (let i = 0; i < count; i++) {
    newCodes.push({
      code: generateCode(),
      createdBy: authUser.userId,
      status: "active",
      expiresAt,
      createdAt: now.toISOString(),
      usedBy: null,
      usedAt: null,
    });
  }

  const invitesCol = await getCollection<InviteCode>("invite_codes");
  if (invitesCol) {
    await invitesCol.insertMany(newCodes as any);
  } else {
    const memory = getMemoryCollection<InviteCode>("invite_codes");
    newCodes.forEach((c) => memory.push({ ...c, _id: `code-${c.code}` }));
  }

  return NextResponse.json({
    ok: true,
    data: {
      message: `Generated ${count} invite code(s).`,
      codes: newCodes.map((c) => c.code),
    },
  });
}

export async function DELETE(req: Request) {
  const authUser = await getAuthUserFromRequest(req);
  if (!authUser || authUser.role !== "admin") {
    return NextResponse.json({ ok: false, error: { code: "FORBIDDEN", message: "Admin privileges required" } }, { status: 403 });
  }

  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  if (!code) {
    return NextResponse.json({ ok: false, error: { code: "INVALID_CODE", message: "Code parameter is required" } }, { status: 400 });
  }

  const invitesCol = await getCollection<InviteCode>("invite_codes");
  if (invitesCol) {
    await invitesCol.updateOne({ code }, { $set: { status: "revoked" } });
  } else {
    const memory = getMemoryCollection<InviteCode>("invite_codes");
    const found = memory.find((c) => c.code === code);
    if (found) found.status = "revoked";
  }

  return NextResponse.json({ ok: true, data: { message: `Code ${code} revoked.` } });
}
