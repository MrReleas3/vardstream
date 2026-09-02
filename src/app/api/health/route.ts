import { NextResponse } from "next/server";
import { isDbConnected } from "@/lib/db";
import { isRedisConnected } from "@/lib/redis";
import { bootstrapDatabase } from "@/lib/seed";

export async function GET() {
  await bootstrapDatabase();

  return NextResponse.json({
    ok: true,
    data: {
      status: "healthy",
      timestamp: new Date().toISOString(),
      services: {
        database: isDbConnected() ? "connected" : "in-memory (dev)",
        redis: isRedisConnected() ? "connected" : "in-memory (dev)",
      },
      version: "2.0.0",
    },
  });
}
