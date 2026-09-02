"use client";

import React, { useState, useEffect } from "react";
import { Settings, Sliders, RefreshCw, CheckCircle2, Tv } from "lucide-react";
import { getSimklAuthUrl } from "@/lib/simkl";

export default function SettingsPage() {
  const [profile, setProfile] = useState<any>(null);
  const [subtitleLang, setSubtitleLang] = useState("en");
  const [autoPlayNext, setAutoPlayNext] = useState(true);
  const [theme, setTheme] = useState("dark");
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const [simklBanner, setSimklBanner] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("simkl") === "connected") {
        setSimklBanner("Simkl account connected successfully! Full library synchronization is now active.");
      } else if (params.get("simkl") === "failed" || params.get("simkl") === "error") {
        setSimklBanner("Failed to connect Simkl. Please check your credentials and try again.");
      }
    }

    fetch("/api/auth/me")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.ok && data.data) {
          setProfile(data.data);
          if (data.data.preferences) {
            setSubtitleLang(data.data.preferences.defaultSubtitleLang || "en");
            setAutoPlayNext(data.data.preferences.autoPlayNext ?? true);
            setTheme(data.data.preferences.theme || "dark");
          }
        }
      });
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/auth/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          defaultSubtitleLang: subtitleLang,
          autoPlayNext,
          theme,
        }),
      });
      if (res.ok) {
        setSavedSuccess(true);
        setTimeout(() => setSavedSuccess(false), 3000);
      }
    } catch {}
    setSaving(false);
  };

  const [syncingSimkl, setSyncingSimkl] = useState<"import" | "export" | null>(null);
  const [simklSyncMessage, setSimklSyncMessage] = useState<string | null>(null);

  const handleSimklBatchSync = async (action: "import" | "export") => {
    setSyncingSimkl(action);
    setSimklSyncMessage(null);

    try {
      const res = await fetch("/api/simkl/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (data?.ok && data.data?.message) {
        setSimklSyncMessage(data.data.message);
      } else {
        setSimklSyncMessage(data?.error?.message || "Sync failed.");
      }
    } catch {
      setSimklSyncMessage("Network error during Simkl synchronization.");
    }

    setSyncingSimkl(null);
  };

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);
  const [changePasswordError, setChangePasswordError] = useState("");
  const [changePasswordSuccess, setChangePasswordSuccess] = useState("");

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setChangePasswordError("");
    setChangePasswordSuccess("");

    if (newPassword.length < 8) {
      setChangePasswordError("New password must be at least 8 characters long.");
      return;
    }

    if (newPassword !== confirmNewPassword) {
      setChangePasswordError("New passwords do not match.");
      return;
    }

    setChangingPassword(true);

    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      const data = await res.json();
      if (!data.ok) {
        setChangePasswordError(data.error?.message || "Failed to change password.");
      } else {
        setChangePasswordSuccess("Password updated successfully!");
        setCurrentPassword("");
        setNewPassword("");
        setConfirmNewPassword("");
        setTimeout(() => setChangePasswordSuccess(""), 4000);
      }
    } catch {
      setChangePasswordError("A network error occurred while updating password.");
    }

    setChangingPassword(false);
  };

  return (
    <div style={{ maxWidth: 840, margin: "0 auto", padding: "1.5rem 1rem 5rem 1rem" }}>
      {/* Header */}
      <div style={{ marginBottom: "1.5rem", paddingBottom: "0.75rem", borderBottom: "1px solid var(--border-default)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <h1 style={{ fontSize: "1.35rem", fontWeight: 700, letterSpacing: "-0.02em" }}>User Preferences</h1>
          <span className="badge-mono">CONFIG</span>
        </div>
        <p style={{ color: "var(--text-muted)", fontSize: "0.78rem", marginTop: 2 }}>
          Account credentials, playback defaults, and third-party Simkl synchronization
        </p>
      </div>

      {simklBanner && (
        <div
          className="panel"
          style={{
            marginBottom: "1rem",
            padding: "0.75rem 1rem",
            background: "var(--bg-surface)",
            border: "1px solid var(--accent-emerald)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            fontSize: "0.8rem",
            color: "var(--text-primary)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <CheckCircle2 size={15} color="var(--accent-emerald)" />
            <span>{simklBanner}</span>
          </div>
          <button
            type="button"
            onClick={() => setSimklBanner(null)}
            className="btn btn-ghost font-mono"
            style={{ padding: "2px 6px", fontSize: "0.7rem" }}
          >
            DISMISS
          </button>
        </div>
      )}

      <form onSubmit={handleSave} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
        {/* Profile Card */}
        {profile && (
          <div className="panel" style={{ padding: "1rem", background: "var(--bg-surface)" }}>
            <span className="font-mono" style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--text-muted)", display: "block", marginBottom: 8 }}>
              // ACCOUNT_IDENTITY
            </span>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "0.75rem" }}>
              <div>
                <label className="font-mono" style={{ fontSize: "0.7rem", color: "var(--text-muted)", display: "block", marginBottom: 2 }}>
                  USERNAME
                </label>
                <div className="font-mono" style={{ fontWeight: 600, fontSize: "0.85rem", color: "var(--text-primary)" }}>
                  {profile.username}
                </div>
              </div>
              <div>
                <label className="font-mono" style={{ fontSize: "0.7rem", color: "var(--text-muted)", display: "block", marginBottom: 2 }}>
                  EMAIL_ADDRESS
                </label>
                <div className="font-mono" style={{ fontWeight: 600, fontSize: "0.85rem", color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {profile.email}
                </div>
              </div>
              <div>
                <label className="font-mono" style={{ fontSize: "0.7rem", color: "var(--text-muted)", display: "block", marginBottom: 2 }}>
                  SYSTEM_ROLE
                </label>
                <div>
                  <span className={`badge-mono ${profile.role === "admin" ? "badge-brand" : ""}`}>
                    {profile.role}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Playback Preferences */}
        <div className="panel" style={{ padding: "1rem", background: "var(--bg-surface)" }}>
          <span className="font-mono" style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--text-muted)", display: "block", marginBottom: 8 }}>
            // PLAYBACK_CONFIGURATION
          </span>

          <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
            <div>
              <label className="font-mono" style={{ fontSize: "0.7rem", color: "var(--text-muted)", display: "block", marginBottom: 3 }}>
                DEFAULT_SUBTITLE_LANGUAGE
              </label>
              <select
                value={subtitleLang}
                onChange={(e) => setSubtitleLang(e.target.value)}
                className="select-field font-mono"
                style={{ maxWidth: 260 }}
              >
                <option value="en">English (en)</option>
                <option value="es">Spanish (es)</option>
                <option value="fr">French (fr)</option>
                <option value="de">German (de)</option>
                <option value="it">Italian (it)</option>
                <option value="pt">Portuguese (pt)</option>
                <option value="ja">Japanese (ja)</option>
              </select>
            </div>

            <div className="divider" style={{ margin: "0.25rem 0" }} />

            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
              <div>
                <div className="font-mono" style={{ fontWeight: 600, fontSize: "0.82rem" }}>AUTO_PLAY_NEXT_EPISODE</div>
                <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                  Advance to next index on episode completion.
                </div>
              </div>
              <input
                type="checkbox"
                checked={autoPlayNext}
                onChange={(e) => setAutoPlayNext(e.target.checked)}
                style={{ width: 16, height: 16, accentColor: "var(--text-primary)", cursor: "pointer" }}
              />
            </div>
          </div>
        </div>

        {/* Simkl Sync Integration */}
        <div className="panel" style={{ padding: "1rem", background: "var(--bg-surface)" }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: "0.75rem" }}>
            <div>
              <span className="font-mono" style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--text-muted)", display: "block", marginBottom: 3 }}>
                // SIMKL_SYNC_MODULE
              </span>
              <p style={{ color: "var(--text-secondary)", fontSize: "0.78rem", maxWidth: 450 }}>
                Synchronize playback progress and watchlist across third-party Simkl clients.
              </p>
            </div>

            {profile?.simklConnected ? (
              <span className="badge-mono badge-emerald" style={{ padding: "3px 7px" }}>
                <CheckCircle2 size={11} /> SYNCED_ACTIVE
              </span>
            ) : (
              <a
                href={getSimklAuthUrl()}
                className="btn btn-secondary font-mono"
                style={{ padding: "5px 10px", fontSize: "0.75rem" }}
              >
                CONNECT_SIMKL
              </a>
            )}
          </div>

          {/* Batch Sync Actions (When Connected) */}
          {profile?.simklConnected && (
            <div style={{ marginTop: "1rem", paddingTop: "0.75rem", borderTop: "1px solid var(--border-subtle)" }}>
              <span className="font-mono" style={{ fontSize: "0.7rem", color: "var(--text-muted)", display: "block", marginBottom: 6 }}>
                // BATCH_FULL_SYNC_OPERATIONS
              </span>
              <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", alignItems: "center" }}>
                <button
                  type="button"
                  disabled={syncingSimkl !== null}
                  onClick={() => handleSimklBatchSync("import")}
                  className="btn btn-secondary font-mono"
                  style={{ padding: "5px 12px", fontSize: "0.75rem", gap: 5 }}
                >
                  {syncingSimkl === "import" ? <RefreshCw size={12} className="animate-spin" /> : <RefreshCw size={12} />}
                  IMPORT_FROM_SIMKL
                </button>

                <button
                  type="button"
                  disabled={syncingSimkl !== null}
                  onClick={() => handleSimklBatchSync("export")}
                  className="btn btn-secondary font-mono"
                  style={{ padding: "5px 12px", fontSize: "0.75rem", gap: 5 }}
                >
                  {syncingSimkl === "export" ? <RefreshCw size={12} className="animate-spin" /> : <Tv size={12} />}
                  EXPORT_TO_SIMKL
                </button>
              </div>

              {simklSyncMessage && (
                <div
                  className="font-mono"
                  style={{
                    marginTop: "0.65rem",
                    padding: "6px 10px",
                    borderRadius: "var(--radius-xs)",
                    background: "var(--bg-subtle)",
                    border: "1px solid var(--border-subtle)",
                    fontSize: "0.74rem",
                    color: "var(--text-primary)",
                  }}
                >
                  {simklSyncMessage}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Submit Preferences */}
        <div>
          <button type="submit" disabled={saving} className="btn btn-primary font-mono" style={{ padding: "7px 18px", fontSize: "0.8rem" }}>
            {saving ? (
              <RefreshCw size={13} className="animate-spin" />
            ) : savedSuccess ? (
              <>
                <CheckCircle2 size={13} /> CHANGES_SAVED
              </>
            ) : (
              "SAVE_PREFERENCES"
            )}
          </button>
        </div>
      </form>

      {/* Separate Form for Change Password */}
      <div className="panel" style={{ marginTop: "1.5rem", padding: "1.25rem", background: "var(--bg-surface)" }}>
        <span className="font-mono" style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--text-muted)", display: "block", marginBottom: 3 }}>
          // SECURITY_CREDENTIALS
        </span>
        <p style={{ color: "var(--text-secondary)", fontSize: "0.78rem", marginBottom: "1rem" }}>
          Update your account password. Requires your existing password for verification.
        </p>

        {changePasswordError && (
          <div
            style={{
              background: "var(--accent-rose-subtle)",
              border: "1px solid rgba(244, 63, 94, 0.3)",
              color: "#fda4af",
              padding: "7px 12px",
              borderRadius: "var(--radius-xs)",
              fontSize: "0.78rem",
              marginBottom: "1rem",
              display: "flex",
              alignItems: "center",
              gap: 8,
              fontFamily: "var(--font-mono)",
            }}
          >
            {changePasswordError}
          </div>
        )}

        {changePasswordSuccess && (
          <div
            style={{
              background: "rgba(16, 185, 129, 0.08)",
              border: "1px solid rgba(16, 185, 129, 0.3)",
              color: "#6ee7b7",
              padding: "7px 12px",
              borderRadius: "var(--radius-xs)",
              fontSize: "0.78rem",
              marginBottom: "1rem",
              display: "flex",
              alignItems: "center",
              gap: 8,
              fontFamily: "var(--font-mono)",
            }}
          >
            <CheckCircle2 size={14} color="#10b981" /> {changePasswordSuccess}
          </div>
        )}

        <form onSubmit={handleChangePassword} style={{ display: "flex", flexDirection: "column", gap: "0.85rem", maxWidth: 420 }}>
          <div>
            <label className="font-mono" style={{ fontSize: "0.7rem", color: "var(--text-muted)", display: "block", marginBottom: 3 }}>
              CURRENT_PASSWORD
            </label>
            <input
              type="password"
              placeholder="••••••••"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="input-field font-mono"
              style={{ fontSize: "0.8rem", padding: "6px 10px" }}
              required
            />
          </div>

          <div>
            <label className="font-mono" style={{ fontSize: "0.7rem", color: "var(--text-muted)", display: "block", marginBottom: 3 }}>
              NEW_PASSWORD (MIN 8 CHARS)
            </label>
            <input
              type="password"
              placeholder="••••••••"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="input-field font-mono"
              style={{ fontSize: "0.8rem", padding: "6px 10px" }}
              required
              minLength={8}
            />
          </div>

          <div>
            <label className="font-mono" style={{ fontSize: "0.7rem", color: "var(--text-muted)", display: "block", marginBottom: 3 }}>
              CONFIRM_NEW_PASSWORD
            </label>
            <input
              type="password"
              placeholder="••••••••"
              value={confirmNewPassword}
              onChange={(e) => setConfirmNewPassword(e.target.value)}
              className="input-field font-mono"
              style={{ fontSize: "0.8rem", padding: "6px 10px" }}
              required
              minLength={8}
            />
          </div>

          <div>
            <button
              type="submit"
              disabled={changingPassword}
              className="btn btn-secondary font-mono"
              style={{ padding: "6px 16px", fontSize: "0.78rem", marginTop: "0.25rem" }}
            >
              {changingPassword ? <RefreshCw size={12} className="animate-spin" /> : "UPDATE_PASSWORD"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
