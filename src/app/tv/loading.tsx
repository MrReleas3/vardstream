import React from "react";
import MediaGridSkeleton from "@/components/skeletons/MediaGridSkeleton";
import { Skeleton } from "@/components/ui/skeleton";

export default function TvLoading() {
  return (
    <div style={{ maxWidth: 1360, margin: "0 auto", padding: "1rem 1rem 4rem 1rem" }}>
      {/* Header Skeleton */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "1rem",
          paddingBottom: "0.75rem",
          borderBottom: "1px solid var(--border-subtle)",
          flexWrap: "wrap",
          gap: "0.75rem",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Skeleton style={{ width: 160, height: 24 }} />
          <Skeleton style={{ width: 80, height: 18 }} />
        </div>
        <Skeleton style={{ width: 110, height: 28 }} />
      </div>

      {/* Category Pills Skeleton */}
      <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1.25rem", flexWrap: "wrap" }}>
        <Skeleton style={{ width: 80, height: 28 }} />
        <Skeleton style={{ width: 95, height: 28 }} />
        <Skeleton style={{ width: 85, height: 28 }} />
        <Skeleton style={{ width: 90, height: 28 }} />
      </div>

      {/* Status indicator */}
      <div style={{ marginBottom: "0.75rem" }}>
        <Skeleton style={{ width: 180, height: 14 }} />
      </div>

      {/* Responsive Grid Skeleton */}
      <MediaGridSkeleton count={18} />
    </div>
  );
}
