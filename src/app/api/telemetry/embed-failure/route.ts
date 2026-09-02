import { NextResponse } from "next/server";
import { EmbedFailureSchema } from "@/lib/validators";
import { getAuthUserFromRequest } from "@/lib/auth";
import { getCollection, getMemoryCollection } from "@/lib/db";
import { checkRateLimit } from "@/lib/rate-limit";
import { TelemetryLog, Provider } from "@/types";

export async function POST(req: Request) {
  try {
    const authUser = await getAuthUserFromRequest(req);
    const ip = req.headers.get("x-forwarded-for") || "127.0.0.1";
    const identifier = authUser ? `telemetry:${authUser.userId}` : `telemetry:${ip}`;

    const rl = await checkRateLimit(identifier, 10, 60);
    if (!rl.success) {
      return NextResponse.json(
        { ok: false, error: { code: "RATE_LIMITED", message: "Too many failure reports submitted." } },
        { status: 429 }
      );
    }

    const body = await req.json();
    const validated = EmbedFailureSchema.safeParse(body);
    if (!validated.success) {
      return NextResponse.json(
        { ok: false, error: { code: "VALIDATION_ERROR", message: validated.error.issues[0].message } },
        { status: 400 }
      );
    }

    const { mediaId, mediaType, providerSlug, reportType, userAgent } = validated.data;
    const now = new Date().toISOString();

    const telemetryDoc: TelemetryLog = {
      mediaId,
      mediaType,
      providerSlug,
      reportType,
      reportedBy: authUser?.userId,
      userAgent: userAgent || req.headers.get("user-agent") || undefined,
      createdAt: now,
    };

    const telemetryCol = await getCollection<TelemetryLog>("telemetry_logs");
    if (telemetryCol) {
      await telemetryCol.insertOne(telemetryDoc as any);
      // Increment 24h failure count on provider immediately
      const providersCol = await getCollection<Provider>("providers");
      await providersCol?.updateOne(
        { slug: providerSlug },
        { $inc: { failureCount24h: 1 }, $set: { lastCheckedAt: now } }
      );
    } else {
      const memoryLogs = getMemoryCollection<TelemetryLog>("telemetry_logs");
      memoryLogs.push(telemetryDoc);

      const memoryProviders = getMemoryCollection<Provider>("providers");
      const p = memoryProviders.find((prov) => prov.slug === providerSlug);
      if (p) {
        p.failureCount24h = (p.failureCount24h || 0) + 1;
        p.lastCheckedAt = now;
      }
    }

    return NextResponse.json({
      ok: true,
      data: { message: "Telemetry recorded successfully" },
    });
  } catch (err: any) {
    console.error("[Telemetry Error]:", err);
    return NextResponse.json(
      { ok: false, error: { code: "INTERNAL_ERROR", message: "Failed to record telemetry." } },
      { status: 500 }
    );
  }
}
