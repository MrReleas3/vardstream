import React from "react";
import Link from "next/link";
import { Terminal, Home, Film, Tv } from "lucide-react";

export default function NotFound() {
  return (
    <div
      style={{
        minHeight: "calc(100vh - 120px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "2rem 1.5rem",
      }}
    >
      <div
        className="panel animate-fade-in"
        style={{
          width: "100%",
          maxWidth: 480,
          padding: "2.5rem 2rem",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          textAlign: "center",
          gap: "1.25rem",
          background: "var(--bg-surface)",
        }}
      >
        <div
          style={{
            width: 48,
            height: 48,
            borderRadius: "var(--radius-xs)",
            background: "var(--bg-subtle)",
            border: "1px solid var(--border-default)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "var(--text-muted)",
          }}
        >
          <Terminal size={24} />
        </div>

        <div>
          <span className="badge-mono badge-rose" style={{ marginBottom: 8 }}>
            HTTP_STATUS // 404_NOT_FOUND
          </span>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 800, letterSpacing: "-0.03em", marginTop: 4 }}>
            Catalog Node Unavailable
          </h1>
          <p style={{ fontSize: "0.82rem", color: "var(--text-muted)", marginTop: 6, lineHeight: 1.5 }}>
            The media record, endpoint, or resource identifier you requested does not exist or has been relocated.
          </p>
        </div>

        <div className="divider" style={{ width: "100%", margin: "0.25rem 0" }} />

        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", justifyContent: "center" }}>
          <Link href="/" className="btn btn-primary font-mono" style={{ padding: "8px 16px", fontSize: "0.78rem", gap: 6 }}>
            <Home size={13} /> RETURN_HOME
          </Link>
          <Link href="/movie" className="btn btn-secondary font-mono" style={{ padding: "8px 14px", fontSize: "0.78rem", gap: 6 }}>
            <Film size={13} /> MOVIES
          </Link>
          <Link href="/tv" className="btn btn-secondary font-mono" style={{ padding: "8px 14px", fontSize: "0.78rem", gap: 6 }}>
            <Tv size={13} /> TV_SHOWS
          </Link>
        </div>
      </div>
    </div>
  );
}
