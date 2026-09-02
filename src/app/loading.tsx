import React from "react";
import HeroSkeleton from "@/components/skeletons/HeroSkeleton";
import MediaRailSkeleton from "@/components/skeletons/MediaRailSkeleton";
import MediaGridSkeleton from "@/components/skeletons/MediaGridSkeleton";
import { Skeleton } from "@/components/ui/skeleton";

export default function HomeLoading() {
  return (
    <div style={{ paddingBottom: "3rem" }}>
      {/* 1. Cinematic Hero Skeleton */}
      <HeroSkeleton />

      {/* 2. Continue Watching Rail Skeleton */}
      <MediaRailSkeleton titleWidth={160} count={6} />

      {/* 3. Latest Anime Feed Skeleton */}
      <section style={{ marginTop: "1rem", padding: "0 1rem" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: "1rem",
            paddingBottom: "0.5rem",
            borderBottom: "1px solid var(--border-subtle)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Skeleton style={{ width: 140, height: 18 }} />
            <Skeleton style={{ width: 100, height: 16 }} />
          </div>
          <Skeleton style={{ width: 60, height: 14 }} />
        </div>

        <MediaGridSkeleton count={12} />
      </section>
    </div>
  );
}
