import { NextResponse } from "next/server";
import { getCollection, getMemoryCollection } from "@/lib/db";
import { TelemetryLog } from "@/types";

export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ ok: false, error: { code: "UNAUTHORIZED", message: "Unauthorized cron execution" } }, { status: 401 });
  }

  const cutoff = new Date(Date.now() - 48 * 3600 * 1000).toISOString();
  const telemetryCol = await getCollection<TelemetryLog>("telemetry_logs");
  let deletedCount = 0;

  if (telemetryCol) {
    const res = await telemetryCol.deleteMany({ createdAt: { $lt: cutoff } });
    deletedCount = res.deletedCount;
  } else {
    const memory = getMemoryCollection<TelemetryLog>("telemetry_logs");
    const initialLen = memory.length;
    const filtered = memory.filter((t) => t.createdAt >= cutoff);
    deletedCount = initialLen - filtered.length;
    memory.length = 0;
    memory.push(...filtered);
  }

  return NextResponse.json({
    ok: true,
    data: {
      message: "Old telemetry pruned successfully",
      deletedCount,
    },
  });
}
