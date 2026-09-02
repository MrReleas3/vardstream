import React from "react";
import { Skeleton } from "@/components/ui/skeleton";

export default function SettingsLoading() {
  return (
    <div style={{ maxWidth: 860, margin: "0 auto", padding: "1.5rem 1rem 5rem 1rem" }}>
      {/* Header Skeleton */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "1.5rem",
          paddingBottom: "0.75rem",
          borderBottom: "1px solid var(--border-subtle)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Skeleton style={{ width: 140, height: 24 }} />
          <Skeleton style={{ width: 80, height: 18 }} />
        </div>
      </div>

      {/* Settings Card Skeletons */}
      <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
        <div className="panel" style={{ padding: "1.25rem", display: "flex", flexDirection: "column", gap: 12 }}>
          <Skeleton style={{ width: 160, height: 18 }} />
          <Skeleton style={{ width: "100%", height: 38 }} />
          <Skeleton style={{ width: "80%", height: 38 }} />
        </div>

        <div className="panel" style={{ padding: "1.25rem", display: "flex", flexDirection: "column", gap: 12 }}>
          <Skeleton style={{ width: 180, height: 18 }} />
          <Skeleton style={{ width: "100%", height: 44 }} />
        </div>

        <div className="panel" style={{ padding: "1.25rem", display: "flex", flexDirection: "column", gap: 12 }}>
          <Skeleton style={{ width: 140, height: 18 }} />
          <Skeleton style={{ width: "100%", height: 38 }} />
        </div>
      </div>
    </div>
  );
}
