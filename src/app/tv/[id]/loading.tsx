import React from "react";

export default function TvDetailLoading() {
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
        READING SERIES RECORD...
      </div>
    </div>
  );
}
