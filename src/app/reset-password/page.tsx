"use client";

import React, { useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { Lock, ArrowRight, AlertCircle, CheckCircle2, KeyRound } from "lucide-react";

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div style={{ maxWidth: 400, margin: "4rem auto", textAlign: "center" }}>
          <p className="font-mono" style={{ color: "var(--text-muted)", fontSize: "0.8rem" }}>
            INITIALIZING_RESET_PORTAL...
          </p>
        </div>
      }
    >
      <ResetPasswordContent />
    </Suspense>
  );
}

function ResetPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!token) {
      setError("Missing password reset token. Please use the link provided in your email.");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters long.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });

      const data = await res.json();
      if (!data.ok) {
        setError(data.error?.message || "Failed to reset password.");
      } else {
        setSuccess(true);
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
            CREDENTIAL_UPDATE
          </span>
          <h1 style={{ fontSize: "1.35rem", fontWeight: 700, letterSpacing: "-0.02em" }}>
            Set New Password
          </h1>
          <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginTop: 4 }}>
            Enter and confirm your new account security credentials.
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

        {success ? (
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
                <CheckCircle2 size={16} color="#10b981" /> Password Reset Complete
              </div>
              <p style={{ margin: 0, color: "var(--text-secondary)", fontSize: "0.78rem" }}>
                Your account password has been updated securely. You can now log in to the streaming portal.
              </p>
            </div>

            <Link
              href="/login"
              className="btn btn-primary font-mono"
              style={{ width: "100%", padding: "9px", fontSize: "0.8rem", justifyContent: "center", gap: 6 }}
            >
              PROCEED_TO_SIGN_IN <ArrowRight size={13} />
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <div>
              <label
                className="font-mono"
                style={{ fontSize: "0.72rem", color: "var(--text-muted)", display: "block", marginBottom: 4 }}
              >
                NEW_PASSWORD (MIN 8 CHARS)
              </label>
              <div style={{ position: "relative" }}>
                <Lock
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
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input-field font-mono"
                  style={{ paddingLeft: 32, fontSize: "0.82rem" }}
                  required
                  minLength={8}
                />
              </div>
            </div>

            <div>
              <label
                className="font-mono"
                style={{ fontSize: "0.72rem", color: "var(--text-muted)", display: "block", marginBottom: 4 }}
              >
                CONFIRM_NEW_PASSWORD
              </label>
              <div style={{ position: "relative" }}>
                <KeyRound
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
                  type="password"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="input-field font-mono"
                  style={{ paddingLeft: 32, fontSize: "0.82rem" }}
                  required
                  minLength={8}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary font-mono"
              style={{ width: "100%", padding: "9px", marginTop: "0.25rem", fontSize: "0.82rem", gap: 6 }}
            >
              {loading ? "UPDATING_CREDENTIALS..." : "UPDATE_PASSWORD"} <ArrowRight size={14} />
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
