import React from "react";

export default function Loading() {
  return (
    <div
      style={{
        flex: 1,
        minHeight: "60vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "'JetBrains Mono', 'Share Tech Mono', monospace",
        color: "#8ecf8e",
        gap: 12,
      }}
    >
      <div style={{ fontSize: 24, animation: "blink 1s step-end infinite" }}>_</div>
      <div style={{ fontSize: 11, letterSpacing: "0.25em", color: "rgba(142,207,142,0.6)" }}>
        INITIALIZING TERMINAL FEED...
      </div>
      <div style={{ fontSize: 9, color: "rgba(142,207,142,0.3)", letterSpacing: "0.15em" }}>
        SYS: VARD_stream v2.4.1
      </div>
    </div>
  );
}
