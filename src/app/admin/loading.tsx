import React from "react";
import { Skeleton } from "@/components/ui/skeleton";

export default function AdminLoading() {
  return (
    <div style={{ maxWidth: 1360, margin: "0 auto", padding: "1.5rem 1rem 5rem 1rem" }}>
      {/* Header Skeleton */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "1.5rem",
          paddingBottom: "0.75rem",
          borderBottom: "1px solid var(--border-subtle)",
          flexWrap: "wrap",
          gap: "0.75rem",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Skeleton style={{ width: 160, height: 24 }} />
          <Skeleton style={{ width: 90, height: 18 }} />
        </div>

        {/* Tab pills skeleton */}
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <Skeleton style={{ width: 80, height: 28 }} />
          <Skeleton style={{ width: 80, height: 28 }} />
          <Skeleton style={{ width: 80, height: 28 }} />
          <Skeleton style={{ width: 90, height: 28 }} />
        </div>
      </div>

      {/* Metrics Row Skeleton */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: "1rem", marginBottom: "1.5rem" }}>
        <div className="panel" style={{ padding: "1rem", display: "flex", flexDirection: "column", gap: 8 }}>
          <Skeleton style={{ width: 80, height: 14 }} />
          <Skeleton style={{ width: 60, height: 28 }} />
        </div>
        <div className="panel" style={{ padding: "1rem", display: "flex", flexDirection: "column", gap: 8 }}>
          <Skeleton style={{ width: 90, height: 14 }} />
          <Skeleton style={{ width: 60, height: 28 }} />
        </div>
        <div className="panel" style={{ padding: "1rem", display: "flex", flexDirection: "column", gap: 8 }}>
          <Skeleton style={{ width: 100, height: 14 }} />
          <Skeleton style={{ width: 60, height: 28 }} />
        </div>
      </div>

      {/* Table Skeleton */}
      <div className="panel" style={{ padding: "1rem", display: "flex", flexDirection: "column", gap: 10 }}>
        <Skeleton style={{ width: "100%", height: 36 }} />
        <Skeleton style={{ width: "100%", height: 36 }} />
        <Skeleton style={{ width: "100%", height: 36 }} />
        <Skeleton style={{ width: "100%", height: 36 }} />
      </div>
    </div>
  );
}
