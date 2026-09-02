import React from "react";
import { Skeleton } from "@/components/ui/skeleton";

export default function MediaCardSkeleton() {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        width: "100%",
        background: "var(--bg-surface, #121316)",
        border: "1px solid var(--border-default, #27272a)",
        borderRadius: "var(--radius-xs, 2px)",
        overflow: "hidden",
      }}
    >
      {/* 2:3 Poster Area */}
      <div
        style={{
          width: "100%",
          aspectRatio: "2/3",
          position: "relative",
          overflow: "hidden",
          borderBottom: "1px solid var(--border-subtle, #18191e)",
        }}
      >
        <Skeleton style={{ width: "100%", height: "100%", border: "none" }} />

        {/* Top Badges Placeholders */}
        <div
          style={{
            position: "absolute",
            top: 6,
            left: 6,
            right: 6,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <Skeleton
            style={{
              width: 28,
              height: 14,
              background: "rgba(9, 9, 11, 0.7)",
              borderColor: "rgba(39, 39, 42, 0.5)",
            }}
          />
          <Skeleton
            style={{
              width: 32,
              height: 14,
              background: "rgba(9, 9, 11, 0.7)",
              borderColor: "rgba(39, 39, 42, 0.5)",
            }}
          />
        </div>
      </div>

      {/* Info Block */}
      <div style={{ padding: "8px", display: "flex", flexDirection: "column", gap: 6 }}>
        {/* Title skeleton */}
        <Skeleton style={{ width: "80%", height: 13 }} />

        {/* Metadata row skeleton */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginTop: 2,
          }}
        >
          <Skeleton style={{ width: 42, height: 11 }} />
          <Skeleton style={{ width: 28, height: 11 }} />
        </div>
      </div>
    </div>
  );
}
