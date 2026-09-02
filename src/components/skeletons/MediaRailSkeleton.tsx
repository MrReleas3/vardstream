import React from "react";
import { Skeleton } from "@/components/ui/skeleton";
import MediaCardSkeleton from "./MediaCardSkeleton";

interface MediaRailSkeletonProps {
  titleWidth?: number;
  count?: number;
}

export default function MediaRailSkeleton({
  titleWidth = 140,
  count = 6,
}: MediaRailSkeletonProps) {
  const items = Array.from({ length: count }, (_, i) => i);

  return (
    <section style={{ marginBottom: "1.75rem", position: "relative" }}>
      {/* Rail Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "0.75rem",
          padding: "0 1rem",
          borderBottom: "1px solid var(--border-subtle)",
          paddingBottom: "0.5rem",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <Skeleton style={{ width: titleWidth, height: 18 }} />
          <Skeleton style={{ width: 80, height: 14 }} />
        </div>

        {/* Controls skeleton */}
        <div style={{ display: "flex", gap: "0.25rem", alignItems: "center" }}>
          <Skeleton style={{ width: 24, height: 24 }} />
          <Skeleton style={{ width: 24, height: 24 }} />
        </div>
      </div>

      {/* Horizontal Scroll Track */}
      <div
        style={{
          display: "flex",
          gap: "0.75rem",
          overflowX: "hidden",
          padding: "0.25rem 1rem 0.5rem 1rem",
        }}
      >
        {items.map((key) => (
          <div
            key={key}
            style={{
              flexShrink: 0,
              width: "clamp(130px, 36vw, 165px)",
            }}
          >
            <MediaCardSkeleton />
          </div>
        ))}
      </div>
    </section>
  );
}
