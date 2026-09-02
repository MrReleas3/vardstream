import React from "react";
import MediaGridSkeleton from "@/components/skeletons/MediaGridSkeleton";
import { Skeleton } from "@/components/ui/skeleton";

export default function WatchlistLoading() {
  return (
    <div style={{ maxWidth: 1360, margin: "0 auto", padding: "1.5rem 1rem 5rem 1rem" }}>
      {/* Header Skeleton */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "1.25rem",
          paddingBottom: "0.75rem",
          borderBottom: "1px solid var(--border-subtle)",
          flexWrap: "wrap",
          gap: "0.75rem",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Skeleton style={{ width: 140, height: 24 }} />
          <Skeleton style={{ width: 80, height: 18 }} />
        </div>

        {/* Tab filters skeleton */}
        <div style={{ display: "flex", gap: "0.35rem", flexWrap: "wrap" }}>
          <Skeleton style={{ width: 45, height: 24 }} />
          <Skeleton style={{ width: 75, height: 24 }} />
          <Skeleton style={{ width: 85, height: 24 }} />
          <Skeleton style={{ width: 70, height: 24 }} />
          <Skeleton style={{ width: 55, height: 24 }} />
        </div>
      </div>

      <MediaGridSkeleton count={12} />
    </div>
  );
}
