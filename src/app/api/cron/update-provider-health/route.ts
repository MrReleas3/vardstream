import { NextResponse } from "next/server";
import { getCollection, getMemoryCollection } from "@/lib/db";
import { Provider, TelemetryLog } from "@/types";

export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ ok: false, error: { code: "UNAUTHORIZED", message: "Unauthorized cron execution" } }, { status: 401 });
  }

  const cutoff = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
  const providersCol = await getCollection<Provider>("providers");
  const telemetryCol = await getCollection<TelemetryLog>("telemetry_logs");

  let providers: Provider[] = [];

  if (providersCol && telemetryCol) {
    providers = (await providersCol.find({}).toArray()) as any;

    for (const provider of providers) {
      const failureCount = await telemetryCol.countDocuments({
        providerSlug: provider.slug,
        createdAt: { $gte: cutoff },
      });

      // Health formula: max(0, 100 - failures * 2)
      const healthScore = Math.max(0, 100 - failureCount * 2);
      const circuitBreakerTripped = healthScore < 30;

      await providersCol.updateOne(
        { slug: provider.slug },
        {
          $set: {
            healthScore,
            failureCount24h: failureCount,
            circuitBreakerTripped,
            lastCheckedAt: new Date().toISOString(),
          },
        }
      );
    }
  } else {
    providers = getMemoryCollection<Provider>("providers");
    const memoryTelemetry = getMemoryCollection<TelemetryLog>("telemetry_logs");

    for (const provider of providers) {
      const failures = memoryTelemetry.filter(
        (t) => t.providerSlug === provider.slug && t.createdAt >= cutoff
      ).length;
      provider.healthScore = Math.max(0, 100 - failures * 2);
      provider.failureCount24h = failures;
      provider.circuitBreakerTripped = provider.healthScore < 30;
      provider.lastCheckedAt = new Date().toISOString();
    }
  }

  return NextResponse.json({
    ok: true,
    data: {
      message: "Provider health updated successfully",
      updatedCount: providers.length,
    },
  });
}
