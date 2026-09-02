import { NextResponse } from "next/server";
import { getAuthUserFromRequest } from "@/lib/auth";
import { getCollection, getMemoryCollection } from "@/lib/db";
import { Provider, TelemetryLog, User } from "@/types";

export async function GET(req: Request) {
  const authUser = await getAuthUserFromRequest(req);
  if (!authUser || authUser.role !== "admin") {
    return NextResponse.json({ ok: false, error: { code: "FORBIDDEN", message: "Admin privileges required" } }, { status: 403 });
  }

  const providersCol = await getCollection<Provider>("providers");
  const telemetryCol = await getCollection<TelemetryLog>("telemetry_logs");
  const usersCol = await getCollection<User>("users");

  let providers: Provider[] = [];
  let totalUsers = 0;
  let recentFailures: TelemetryLog[] = [];

  if (providersCol && telemetryCol && usersCol) {
    providers = (await providersCol.find({}).sort({ healthScore: -1 }).toArray()) as any;
    totalUsers = await usersCol.countDocuments();
    recentFailures = (await telemetryCol.find({}).sort({ createdAt: -1 }).limit(20).toArray()) as any;
  } else {
    providers = getMemoryCollection<Provider>("providers");
    totalUsers = getMemoryCollection<User>("users").length;
    recentFailures = getMemoryCollection<TelemetryLog>("telemetry_logs").slice(-20).reverse();
  }

  const avgHealth =
    providers.length > 0
      ? Math.round(providers.reduce((acc, p) => acc + (p.healthScore || 0), 0) / providers.length)
      : 100;

  return NextResponse.json({
    ok: true,
    data: {
      totalUsers,
      averageHealth: avgHealth,
      providersCount: providers.length,
      activeProviders: providers.filter((p) => p.isEnabled && !p.circuitBreakerTripped).length,
      providers,
      recentFailures,
    },
  });
}
