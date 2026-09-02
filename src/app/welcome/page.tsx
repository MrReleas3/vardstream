"use client";

import React from "react";
import Link from "next/link";
import { Film, Shield, Zap, ArrowRight, Server, Key, Lock, Terminal, Activity } from "lucide-react";

export default function WelcomeLandingPage() {
  return (
    <div style={{ minHeight: "calc(100vh - 54px)", display: "flex", flexDirection: "column" }}>
      {/* Hero Section */}
      <section
        style={{
          position: "relative",
          padding: "5rem 1.5rem 4rem 1.5rem",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
          borderBottom: "1px solid var(--border-default)",
        }}
      >
        <div style={{ position: "relative", zIndex: 1, maxWidth: 840 }}>
          {/* Badge */}
          <div
            className="badge-mono badge-brand"
            style={{
              padding: "4px 12px",
              marginBottom: "1.5rem",
              fontSize: "0.75rem",
            }}
          >
            <Key size={12} /> PRIVATE_STREAMING_CLUSTER // INVITE_ONLY
          </div>

          {/* Headline */}
          <h1
            style={{
              fontSize: "clamp(2.2rem, 5vw, 3.8rem)",
              fontWeight: 800,
              lineHeight: 1.1,
              letterSpacing: "-0.03em",
              marginBottom: "1.25rem",
              color: "#ffffff",
            }}
          >
            Aggregated Streaming Portal. <br />
            <span style={{ color: "var(--text-secondary)" }}>Zero Lag. Multi-Server Resilience.</span>
          </h1>

          {/* Subtitle */}
          <p
            style={{
              fontSize: "0.95rem",
              color: "var(--text-muted)",
              lineHeight: 1.6,
              maxWidth: 620,
              margin: "0 auto 2rem auto",
            }}
          >
            A high-performance media portal with intelligent waterfall embed routing, client-side canary health telemetry, and multi-device playback synchronization.
          </p>

          {/* CTAs */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "0.75rem", flexWrap: "wrap" }}>
            <Link
              href="/register"
              className="btn btn-primary font-mono"
              style={{ padding: "10px 22px", fontSize: "0.85rem", gap: 8 }}
            >
              REGISTER_WITH_KEY <ArrowRight size={14} />
            </Link>
            <Link
              href="/login"
              className="btn btn-secondary font-mono"
              style={{ padding: "10px 20px", fontSize: "0.85rem", gap: 8 }}
            >
              <Lock size={13} /> MEMBER_LOGIN
            </Link>
          </div>
        </div>
      </section>

      {/* Feature Bento Grid */}
      <section style={{ maxWidth: 1200, margin: "3rem auto", padding: "0 1.5rem", width: "100%" }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: "1rem",
          }}
        >
          <div className="panel" style={{ padding: "1.5rem", background: "var(--bg-surface)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
              <div
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: "var(--radius-xs)",
                  background: "var(--bg-subtle)",
                  border: "1px solid var(--border-default)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "var(--text-primary)",
                }}
              >
                <Server size={14} />
              </div>
              <span className="font-mono" style={{ fontSize: "0.82rem", fontWeight: 700 }}>
                WATERFALL_ROUTING
              </span>
            </div>
            <p style={{ color: "var(--text-muted)", fontSize: "0.82rem", lineHeight: 1.6 }}>
              Automated multi-server fallbacks across VidSrc, SuperEmbed, and AutoEmbed ensure continuous playback even when individual sources fail.
            </p>
          </div>

          <div className="panel" style={{ padding: "1.5rem", background: "var(--bg-surface)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
              <div
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: "var(--radius-xs)",
                  background: "var(--bg-subtle)",
                  border: "1px solid var(--border-default)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "var(--accent-brand)",
                }}
              >
                <Activity size={14} />
              </div>
              <span className="font-mono" style={{ fontSize: "0.82rem", fontWeight: 700 }}>
                CANARY_TELEMETRY
              </span>
            </div>
            <p style={{ color: "var(--text-muted)", fontSize: "0.82rem", lineHeight: 1.6 }}>
              Real-time iframe failure triggers and automated background circuit breakers actively score and prioritize responsive streams.
            </p>
          </div>

          <div className="panel" style={{ padding: "1.5rem", background: "var(--bg-surface)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
              <div
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: "var(--radius-xs)",
                  background: "var(--bg-subtle)",
                  border: "1px solid var(--border-default)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "var(--accent-emerald)",
                }}
              >
                <Shield size={14} />
              </div>
              <span className="font-mono" style={{ fontSize: "0.82rem", fontWeight: 700 }}>
                INVITE_PROTECTED
              </span>
            </div>
            <p style={{ color: "var(--text-muted)", fontSize: "0.82rem", lineHeight: 1.6 }}>
              Single-use invite tokens guarantee controlled resource allocation, low-congestion routing, and reliable playback bandwidth.
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer
        style={{
          marginTop: "auto",
          borderTop: "1px solid var(--border-default)",
          padding: "1.5rem",
          textAlign: "center",
          color: "var(--text-muted)",
          fontSize: "0.75rem",
          fontFamily: "var(--font-mono)",
        }}
      >
        <p>VARDSTREAM // PRIVATE_MEDIA_ROUTER &copy; 2026 // ALL_RIGHTS_RESERVED</p>
      </footer>
    </div>
  );
}
