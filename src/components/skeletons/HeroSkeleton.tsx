import React from "react";
import { Skeleton } from "@/components/ui/skeleton";

export default function HeroSkeleton() {
  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        minHeight: "48vh",
        maxHeight: "600px",
        display: "flex",
        alignItems: "center",
        borderBottom: "1px solid var(--border-default)",
        marginBottom: "1.5rem",
        background: "var(--bg-canvas, #060608)",
        overflow: "hidden",
      }}
    >
      {/* Background Shimmer & Gradient Overlay */}
      <div style={{ position: "absolute", inset: 0, opacity: 0.35 }}>
        <Skeleton style={{ width: "100%", height: "100%", border: "none" }} />
      </div>

      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "linear-gradient(180deg, rgba(9, 9, 11, 0.2) 0%, rgba(9, 9, 11, 0.85) 65%, #060608 100%), linear-gradient(90deg, #060608 0%, rgba(9, 9, 11, 0.9) 45%, rgba(9, 9, 11, 0.3) 100%)",
          zIndex: 2,
        }}
      />

      {/* Content Area */}
      <div
        style={{
          position: "relative",
          zIndex: 10,
          maxWidth: 750,
          padding: "2.5rem 1rem",
          display: "flex",
          flexDirection: "column",
          gap: "0.85rem",
          width: "100%",
        }}
      >
        {/* Metadata Badges */}
        <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
          <Skeleton style={{ width: 75, height: 20 }} />
          <Skeleton style={{ width: 65, height: 20 }} />
          <Skeleton style={{ width: 55, height: 20 }} />
        </div>

        {/* Title */}
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <Skeleton style={{ width: "65%", height: 36, minWidth: 220 }} />
          <Skeleton style={{ width: "40%", height: 28 }} />
        </div>

        {/* Overview lines */}
        <div style={{ display: "flex", flexDirection: "column", gap: 6, maxWidth: 580, marginTop: 4 }}>
          <Skeleton style={{ width: "100%", height: 14 }} />
          <Skeleton style={{ width: "85%", height: 14 }} />
        </div>

        {/* CTA Buttons */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 8 }}>
          <Skeleton style={{ width: 120, height: 34 }} />
          <Skeleton style={{ width: 140, height: 34 }} />
        </div>
      </div>
    </div>
  );
}
