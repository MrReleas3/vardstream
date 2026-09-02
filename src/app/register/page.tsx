"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Lock, Mail, User, Key, ArrowRight, AlertCircle } from "lucide-react";

export default function RegisterPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, username, password, inviteCode }),
      });

      const data = await res.json();
      if (!data.ok) {
        setError(data.error?.message || "Registration failed");
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
          maxWidth: 440,
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
            INVITE_VERIFICATION
          </span>
          <h1 style={{ fontSize: "1.4rem", fontWeight: 700, letterSpacing: "-0.02em" }}>Register Account</h1>
          <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginTop: 2 }}>
            A single-use invite key is required to provision access
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

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "0.9rem" }}>
          <div>
            <label className="font-mono" style={{ fontSize: "0.72rem", color: "var(--text-muted)", display: "block", marginBottom: 4 }}>
              INVITE_KEY <span style={{ color: "var(--accent-brand)" }}>*</span>
            </label>
            <div style={{ position: "relative" }}>
              <Key size={14} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--accent-brand)" }} />
              <input
                type="text"
                placeholder="VIP-ALPHA-2026"
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value)}
                className="input-field font-mono"
                style={{ paddingLeft: 32, fontSize: "0.82rem", textTransform: "uppercase", letterSpacing: "0.05em" }}
                required
              />
            </div>
          </div>

          <div>
            <label className="font-mono" style={{ fontSize: "0.72rem", color: "var(--text-muted)", display: "block", marginBottom: 4 }}>
              USERNAME
            </label>
            <div style={{ position: "relative" }}>
              <User size={14} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
              <input
                type="text"
                placeholder="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="input-field font-mono"
                style={{ paddingLeft: 32, fontSize: "0.82rem" }}
                required
              />
            </div>
          </div>

          <div>
            <label className="font-mono" style={{ fontSize: "0.72rem", color: "var(--text-muted)", display: "block", marginBottom: 4 }}>
              EMAIL_ADDRESS
            </label>
            <div style={{ position: "relative" }}>
              <Mail size={14} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
              <input
                type="email"
                placeholder="user@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input-field font-mono"
                style={{ paddingLeft: 32, fontSize: "0.82rem" }}
                required
              />
            </div>
          </div>

          <div>
            <label className="font-mono" style={{ fontSize: "0.72rem", color: "var(--text-muted)", display: "block", marginBottom: 4 }}>
              PASSWORD (MIN 8 CHARS)
            </label>
            <div style={{ position: "relative" }}>
              <Lock size={14} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input-field font-mono"
                style={{ paddingLeft: 32, fontSize: "0.82rem" }}
                minLength={8}
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
            {loading ? "PROVISIONING..." : "PROVISION_ACCOUNT"} <ArrowRight size={14} />
          </button>
        </form>

        <div style={{ textAlign: "center", fontSize: "0.78rem", color: "var(--text-muted)", borderTop: "1px solid var(--border-subtle)", paddingTop: "1rem" }}>
          Already have an account?{" "}
          <Link href="/login" style={{ color: "var(--text-primary)", fontWeight: 600 }}>
            Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}
