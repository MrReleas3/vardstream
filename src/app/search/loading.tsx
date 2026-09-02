import React from "react";
import MediaGridSkeleton from "@/components/skeletons/MediaGridSkeleton";
import { Skeleton } from "@/components/ui/skeleton";

export default function SearchLoading() {
  return (
    <div style={{ maxWidth: 1360, margin: "0 auto", padding: "1.5rem 1rem 5rem 1rem" }}>
      {/* Search Input Bar Skeleton */}
      <div style={{ maxWidth: 650, margin: "0 auto 1.5rem auto" }}>
        <Skeleton style={{ width: "100%", height: 42 }} />

        {/* Type pills skeleton */}
        <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.75rem", justifyContent: "center" }}>
          <Skeleton style={{ width: 55, height: 26 }} />
          <Skeleton style={{ width: 75, height: 26 }} />
          <Skeleton style={{ width: 85, height: 26 }} />
        </div>
      </div>

      {/* Results Header Skeleton */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "0.75rem",
          paddingBottom: "0.5rem",
          borderBottom: "1px solid var(--border-subtle)",
        }}
      >
        <Skeleton style={{ width: 140, height: 16 }} />
        <Skeleton style={{ width: 80, height: 14 }} />
      </div>

      <MediaGridSkeleton count={12} />
    </div>
  );
}
