"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Lock, User, ArrowRight, AlertCircle, Key } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [emailOrUsername, setEmailOrUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emailOrUsername, password }),
      });

      const data = await res.json();
      if (!data.ok) {
        setError(data.error?.message || "Authentication failed");
      } else {
        router.push("/");
      }
    } catch {
      setError("An unexpected network error occurred.");
    }

    setLoading(false);
  };

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
          maxWidth: 400,
          padding: "2rem",
          display: "flex",
          flexDirection: "column",
          gap: "1.5rem",
          background: "var(--bg-surface)",
        }}
      >
        {/* Header */}
        <div>
          <span className="badge-mono badge-brand" style={{ marginBottom: 8 }}>
            AUTH_TERMINAL
          </span>
          <h1 style={{ fontSize: "1.4rem", fontWeight: 700, letterSpacing: "-0.02em" }}>Sign In</h1>
          <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginTop: 2 }}>
            Enter your credentials to access the streaming portal
          </p>
        </div>

        {error && (
          <div
            style={{
              background: "var(--accent-rose-subtle)",
              border: "1px solid rgba(244, 63, 94, 0.3)",
              color: "#fda4af",
              padding: "8px 12px",
              borderRadius: "var(--radius-xs)",
              fontSize: "0.8rem",
              display: "flex",
              alignItems: "center",
              gap: 8,
              fontFamily: "var(--font-mono)",
            }}
          >
            <AlertCircle size={14} /> {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <div>
            <label className="font-mono" style={{ fontSize: "0.72rem", color: "var(--text-muted)", display: "block", marginBottom: 4 }}>
              USERNAME_OR_EMAIL
            </label>
            <div style={{ position: "relative" }}>
              <User size={14} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
              <input
                type="text"
                placeholder="user@example.com / username"
                value={emailOrUsername}
                onChange={(e) => setEmailOrUsername(e.target.value)}
                className="input-field font-mono"
                style={{ paddingLeft: 32, fontSize: "0.82rem" }}
                required
              />
            </div>
          </div>

          <div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
              <label className="font-mono" style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>
                PASSWORD
              </label>
              <Link
                href="/forgot-password"
                className="font-mono"
                style={{ fontSize: "0.72rem", color: "var(--text-secondary)", textDecoration: "none" }}
              >
                Forgot password?
              </Link>
            </div>
            <div style={{ position: "relative" }}>
              <Lock size={14} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input-field font-mono"
                style={{ paddingLeft: 32, fontSize: "0.82rem" }}
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary font-mono"
            style={{ width: "100%", padding: "9px", marginTop: "0.5rem", fontSize: "0.82rem", gap: 6 }}
          >
            {loading ? "AUTHENTICATING..." : "AUTHENTICATE"} <ArrowRight size={14} />
          </button>
        </form>

        <div style={{ textAlign: "center", fontSize: "0.78rem", color: "var(--text-muted)", borderTop: "1px solid var(--border-subtle)", paddingTop: "1rem" }}>
          Have an invite code?{" "}
          <Link href="/register" style={{ color: "var(--text-primary)", fontWeight: 600 }}>
            Register with key
          </Link>
        </div>
      </div>
    </div>
  );
}
