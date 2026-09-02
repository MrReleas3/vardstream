import React from "react";
import { Skeleton } from "@/components/ui/skeleton";
import MediaRailSkeleton from "./MediaRailSkeleton";

interface DetailBentoSkeletonProps {
  isTv?: boolean;
}

export default function DetailBentoSkeleton({ isTv = false }: DetailBentoSkeletonProps) {
  return (
    <div style={{ maxWidth: 1360, margin: "0 auto", padding: "1rem 1rem 5rem 1rem" }}>
      {/* Bento Panel Skeleton */}
      <div
        className="panel"
        style={{
          position: "relative",
          overflow: "hidden",
          padding: "1.5rem",
          marginBottom: "2rem",
          background: "var(--bg-surface)",
        }}
      >
        <div className="responsive-detail-grid">
          {/* Left Column: Poster & Quick Actions */}
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            <div
              style={{
                width: "100%",
                maxWidth: 240,
                aspectRatio: "2/3",
                margin: "0 auto",
                borderRadius: "var(--radius-xs)",
                overflow: "hidden",
                border: "1px solid var(--border-default)",
              }}
            >
              <Skeleton style={{ width: "100%", height: "100%", border: "none" }} />
            </div>

            <div style={{ maxWidth: 240, width: "100%", margin: "0 auto", display: "flex", flexDirection: "column", gap: 6 }}>
              <Skeleton style={{ width: "100%", height: 36 }} />
              <Skeleton style={{ width: "100%", height: 32 }} />
            </div>
          </div>

          {/* Right Column: Metadata, Title, Overview, Specs */}
          <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
            {/* Metadata Pills Row */}
            <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
              <Skeleton style={{ width: 85, height: 20 }} />
              <Skeleton style={{ width: 60, height: 20 }} />
              <Skeleton style={{ width: 50, height: 20 }} />
              <Skeleton style={{ width: 70, height: 20 }} />
            </div>

            {/* Title */}
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <Skeleton style={{ width: "70%", height: 34, minWidth: 200 }} />
              <Skeleton style={{ width: "45%", height: 16 }} />
            </div>

            {/* Genre Tags */}
            <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap", marginTop: "0.25rem" }}>
              <Skeleton style={{ width: 55, height: 20 }} />
              <Skeleton style={{ width: 65, height: 20 }} />
              <Skeleton style={{ width: 60, height: 20 }} />
            </div>

            <div className="divider" style={{ margin: "0.5rem 0" }} />

            {/* Synopsis Overview */}
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <Skeleton style={{ width: 140, height: 14 }} />
              <Skeleton style={{ width: "100%", height: 14 }} />
              <Skeleton style={{ width: "95%", height: 14 }} />
              <Skeleton style={{ width: "80%", height: 14 }} />
            </div>

            {/* If TV Series, Seasons/Episodes Skeleton block */}
            {isTv && (
              <div style={{ marginTop: "1rem", display: "flex", flexDirection: "column", gap: 8 }}>
                <div style={{ display: "flex", gap: 8 }}>
                  <Skeleton style={{ width: 100, height: 30 }} />
                  <Skeleton style={{ width: 100, height: 30 }} />
                  <Skeleton style={{ width: 100, height: 30 }} />
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 8, marginTop: 8 }}>
                  {Array.from({ length: 6 }).map((_, i) => (
                    <Skeleton key={i} style={{ height: 48 }} />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Relations / Recommendations Rail Skeletons */}
      <MediaRailSkeleton titleWidth={120} count={6} />
      <MediaRailSkeleton titleWidth={160} count={6} />
    </div>
  );
}
