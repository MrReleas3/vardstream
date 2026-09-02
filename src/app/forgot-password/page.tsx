"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Mail, ArrowRight, AlertCircle, CheckCircle2, ArrowLeft, KeyRound } from "lucide-react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();
      if (!data.ok) {
        setError(data.error?.message || "Failed to process request.");
      } else {
        setSubmitted(true);
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
          maxWidth: 420,
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
            RECOVERY_TERMINAL
          </span>
          <h1 style={{ fontSize: "1.35rem", fontWeight: 700, letterSpacing: "-0.02em" }}>
            Reset Password
          </h1>
          <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginTop: 4 }}>
            Enter your registered email address to receive a secure password recovery link.
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

        {submitted ? (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "1rem",
            }}
          >
            <div
              style={{
                background: "rgba(16, 185, 129, 0.08)",
                border: "1px solid rgba(16, 185, 129, 0.3)",
                color: "#6ee7b7",
                padding: "1rem",
                borderRadius: "var(--radius-xs)",
                fontSize: "0.82rem",
                display: "flex",
                flexDirection: "column",
                gap: 6,
                lineHeight: 1.5,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 600 }}>
                <CheckCircle2 size={16} color="#10b981" /> Recovery Dispatch Sent
              </div>
              <p style={{ margin: 0, color: "var(--text-secondary)", fontSize: "0.78rem" }}>
                If an account with <strong>{email}</strong> exists, an email containing your password reset link has been dispatched. Please check your inbox and spam folder.
              </p>
            </div>

            <Link
              href="/login"
              className="btn btn-secondary font-mono"
              style={{ width: "100%", padding: "9px", fontSize: "0.8rem", justifyContent: "center", gap: 6 }}
            >
              <ArrowLeft size={13} /> RETURN_TO_SIGN_IN
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <div>
              <label
                className="font-mono"
                style={{ fontSize: "0.72rem", color: "var(--text-muted)", display: "block", marginBottom: 4 }}
              >
                ACCOUNT_EMAIL_ADDRESS
              </label>
              <div style={{ position: "relative" }}>
                <Mail
                  size={14}
                  style={{
                    position: "absolute",
                    left: 10,
                    top: "50%",
                    transform: "translateY(-50%)",
                    color: "var(--text-muted)",
                  }}
                />
                <input
                  type="email"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
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
              style={{ width: "100%", padding: "9px", marginTop: "0.25rem", fontSize: "0.82rem", gap: 6 }}
            >
              {loading ? "DISPATCHING_LINK..." : "SEND_RESET_LINK"} <ArrowRight size={14} />
            </button>

            <div style={{ textAlign: "center", marginTop: "0.5rem" }}>
              <Link
                href="/login"
                className="font-mono"
                style={{ fontSize: "0.75rem", color: "var(--text-muted)", display: "inline-flex", alignItems: "center", gap: 4 }}
              >
                <ArrowLeft size={12} /> Back to Sign In
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
