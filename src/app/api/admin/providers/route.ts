import { NextResponse } from "next/server";
import { getAuthUserFromRequest } from "@/lib/auth";
import { getCollection, getMemoryCollection } from "@/lib/db";
import { ProviderSchema, UpdateProviderSchema } from "@/lib/validators";
import { Provider } from "@/types";
import { cacheDelete } from "@/lib/redis";

export async function GET(req: Request) {
  const authUser = await getAuthUserFromRequest(req);
  if (!authUser || authUser.role !== "admin") {
    return NextResponse.json({ ok: false, error: { code: "FORBIDDEN", message: "Admin privileges required" } }, { status: 403 });
  }

  const providersCol = await getCollection<Provider>("providers");
  let providers: Provider[] = [];

  if (providersCol) {
    providers = (await providersCol.find({}).sort({ priority: 1 }).toArray()) as any;
  } else {
    providers = getMemoryCollection<Provider>("providers");
  }

  return NextResponse.json({ ok: true, data: { providers } });
}

export async function POST(req: Request) {
  const authUser = await getAuthUserFromRequest(req);
  if (!authUser || authUser.role !== "admin") {
    return NextResponse.json({ ok: false, error: { code: "FORBIDDEN", message: "Admin privileges required" } }, { status: 403 });
  }

  const body = await req.json();
  const validated = ProviderSchema.safeParse(body);
  if (!validated.success) {
    return NextResponse.json({ ok: false, error: { code: "VALIDATION_ERROR", message: validated.error.issues[0].message } }, { status: 400 });
  }

  const newProvider: Provider = {
    ...validated.data,
    healthScore: 100,
    failureCount24h: 0,
    circuitBreakerTripped: false,
    createdAt: new Date().toISOString(),
  };

  const providersCol = await getCollection<Provider>("providers");
  if (providersCol) {
    const exists = await providersCol.findOne({ slug: newProvider.slug });
    if (exists) {
      return NextResponse.json({ ok: false, error: { code: "EXISTS", message: "A provider with this slug already exists" } }, { status: 409 });
    }
    await providersCol.insertOne(newProvider as any);
  } else {
    const memory = getMemoryCollection<Provider>("providers");
    if (memory.some((p) => p.slug === newProvider.slug)) {
      return NextResponse.json({ ok: false, error: { code: "EXISTS", message: "A provider with this slug already exists" } }, { status: 409 });
    }
    memory.push({ ...newProvider, _id: `prov-${newProvider.slug}` });
  }

  await cacheDelete("providers:active:v1");

  return NextResponse.json({ ok: true, data: { provider: newProvider } });
}

export async function PATCH(req: Request) {
  const authUser = await getAuthUserFromRequest(req);
  if (!authUser || authUser.role !== "admin") {
    return NextResponse.json({ ok: false, error: { code: "FORBIDDEN", message: "Admin privileges required" } }, { status: 403 });
  }

  const body = await req.json();
  const { slug, ...updates } = body;
  if (!slug) {
    return NextResponse.json({ ok: false, error: { code: "MISSING_SLUG", message: "Provider slug is required" } }, { status: 400 });
  }

  const validated = UpdateProviderSchema.safeParse(updates);
  if (!validated.success) {
    return NextResponse.json({ ok: false, error: { code: "VALIDATION_ERROR", message: validated.error.issues[0].message } }, { status: 400 });
  }

  const providersCol = await getCollection<Provider>("providers");
  if (providersCol) {
    await providersCol.updateOne({ slug }, { $set: validated.data });
  } else {
    const memory = getMemoryCollection<Provider>("providers");
    const p = memory.find((item) => item.slug === slug);
    if (p) Object.assign(p, validated.data);
  }

  await cacheDelete("providers:active:v1");

  return NextResponse.json({ ok: true, data: { message: "Provider updated successfully" } });
}

export async function DELETE(req: Request) {
  const authUser = await getAuthUserFromRequest(req);
  if (!authUser || authUser.role !== "admin") {
    return NextResponse.json({ ok: false, error: { code: "FORBIDDEN", message: "Admin privileges required" } }, { status: 403 });
  }

  const url = new URL(req.url);
  const slug = url.searchParams.get("slug");
  if (!slug) {
    return NextResponse.json({ ok: false, error: { code: "MISSING_SLUG", message: "Provider slug is required" } }, { status: 400 });
  }

  const providersCol = await getCollection<Provider>("providers");
  if (providersCol) {
    await providersCol.deleteOne({ slug });
  } else {
    const memory = getMemoryCollection<Provider>("providers");
    const idx = memory.findIndex((p) => p.slug === slug);
    if (idx !== -1) memory.splice(idx, 1);
  }

  await cacheDelete("providers:active:v1");

  return NextResponse.json({ ok: true, data: { message: `Provider ${slug} removed` } });
}
