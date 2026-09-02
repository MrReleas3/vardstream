"use client";

import React, { useState, useEffect } from "react";
import { Shield, Users, Key, Server, Activity, Plus, Trash2, Ban, CheckCircle, RefreshCw, AlertTriangle, Terminal } from "lucide-react";
import { InviteCode, Provider, TelemetryLog, User } from "@/types";
import ConfirmModal from "@/components/ConfirmModal";

export default function AdminDashboardPage() {
  const [activeTab, setActiveTab] = useState<"overview" | "invites" | "users" | "providers">("overview");

  const [summary, setSummary] = useState<any>(null);
  const [invites, setInvites] = useState<InviteCode[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(true);

  // Deletion confirmation states
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    action: () => Promise<void>;
  }>({
    isOpen: false,
    title: "",
    description: "",
    action: async () => {},
  });
  const [actionLoading, setActionLoading] = useState(false);

  // Forms
  const [newCodeCount, setNewCodeCount] = useState(1);
  const [newCodeDays, setNewCodeDays] = useState(7);
  const [newProvider, setNewProvider] = useState({
    name: "",
    slug: "",
    baseUrl: "",
    moviePattern: "/movie/{tmdbId}",
    tvPattern: "/tv/{tmdbId}/{season}/{episode}",
    supportedTypes: ["movie", "tv"],
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const [sumRes, invRes, userRes, provRes] = await Promise.all([
        fetch("/api/admin/telemetry/summary"),
        fetch("/api/admin/invite-codes"),
        fetch("/api/admin/users"),
        fetch("/api/admin/providers"),
      ]);

      if (sumRes.ok) setSummary((await sumRes.json()).data);
      if (invRes.ok) setInvites((await invRes.json()).data.inviteCodes || []);
      if (userRes.ok) setUsers((await userRes.json()).data.users || []);
      if (provRes.ok) setProviders((await provRes.json()).data.providers || []);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleGenerateCodes = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/admin/invite-codes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ count: newCodeCount, expiresInDays: newCodeDays }),
      });
      if (res.ok) {
        loadData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleRevokeCode = (code: string) => {
    setConfirmDialog({
      isOpen: true,
      title: "CONFIRM_REVOKE_INVITE",
      description: `Are you sure you want to revoke invite code "${code}"? Users will no longer be able to register with this key.`,
      action: async () => {
        setActionLoading(true);
        try {
          await fetch(`/api/admin/invite-codes?code=${code}`, { method: "DELETE" });
          loadData();
        } catch (err) {
          console.error(err);
        }
        setActionLoading(false);
        setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
      },
    });
  };

  const handleToggleUser = async (userId: string, currentDisabled: boolean) => {
    try {
      await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, isDisabled: !currentDisabled }),
      });
      loadData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddProvider = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/admin/providers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newProvider.name,
          slug: newProvider.slug.toLowerCase().trim(),
          baseUrl: newProvider.baseUrl,
          urlPatterns: {
            movie: newProvider.moviePattern,
            tv: newProvider.tvPattern,
          },
          supportedTypes: newProvider.supportedTypes,
        }),
      });
      if (res.ok) {
        setNewProvider({
          name: "",
          slug: "",
          baseUrl: "",
          moviePattern: "/movie/{tmdbId}",
          tvPattern: "/tv/{tmdbId}/{season}/{episode}",
          supportedTypes: ["movie", "tv"],
        });
        loadData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteProvider = (slug: string) => {
    setConfirmDialog({
      isOpen: true,
      title: "CONFIRM_DELETE_PROVIDER",
      description: `Are you sure you want to delete streaming provider "${slug}"? Streams resolving to this provider will fall back to other providers.`,
      action: async () => {
        setActionLoading(true);
        try {
          await fetch(`/api/admin/providers?slug=${slug}`, { method: "DELETE" });
          loadData();
        } catch (err) {
          console.error(err);
        }
        setActionLoading(false);
        setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
      },
    });
  };

  return (
    <div style={{ maxWidth: 1440, margin: "0 auto", padding: "1.5rem 1.5rem 5rem 1.5rem" }}>
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "space-between",
          marginBottom: "1.5rem",
          paddingBottom: "1rem",
          borderBottom: "1px solid var(--border-default)",
          flexWrap: "wrap",
          gap: "1rem",
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <h1 style={{ fontSize: "1.4rem", fontWeight: 700, letterSpacing: "-0.02em" }}>Command Center</h1>
            <span className="badge-mono badge-brand">ADMIN_PORTAL</span>
          </div>
          <p style={{ color: "var(--text-muted)", fontSize: "0.82rem", marginTop: 2 }}>
            Infrastructure telemetry, provider circuit breakers, invite access, and user records
          </p>
        </div>

        <button onClick={loadData} className="btn btn-secondary" style={{ padding: "6px 12px", fontSize: "0.78rem", fontFamily: "var(--font-mono)" }}>
          <RefreshCw size={12} /> SYNC_STATE
        </button>
      </div>

      {/* Segmented Tab Navigation */}
      <div
        style={{
          display: "flex",
          gap: "0.25rem",
          marginBottom: "1.5rem",
          background: "var(--bg-surface)",
          border: "1px solid var(--border-default)",
          borderRadius: "var(--radius-xs)",
          padding: "2px",
          width: "fit-content",
        }}
      >
        <button
          onClick={() => setActiveTab("overview")}
          className="btn btn-ghost"
          style={{
            padding: "5px 12px",
            fontSize: "0.78rem",
            fontFamily: "var(--font-mono)",
            background: activeTab === "overview" ? "var(--bg-surface-elevated)" : "transparent",
            color: activeTab === "overview" ? "var(--text-primary)" : "var(--text-secondary)",
            border: activeTab === "overview" ? "1px solid var(--border-default)" : "1px solid transparent",
          }}
        >
          <Activity size={13} /> TELEMETRY_OVERVIEW
        </button>
        <button
          onClick={() => setActiveTab("invites")}
          className="btn btn-ghost"
          style={{
            padding: "5px 12px",
            fontSize: "0.78rem",
            fontFamily: "var(--font-mono)",
            background: activeTab === "invites" ? "var(--bg-surface-elevated)" : "transparent",
            color: activeTab === "invites" ? "var(--text-primary)" : "var(--text-secondary)",
            border: activeTab === "invites" ? "1px solid var(--border-default)" : "1px solid transparent",
          }}
        >
          <Key size={13} /> INVITES ({invites.length})
        </button>
        <button
          onClick={() => setActiveTab("users")}
          className="btn btn-ghost"
          style={{
            padding: "5px 12px",
            fontSize: "0.78rem",
            fontFamily: "var(--font-mono)",
            background: activeTab === "users" ? "var(--bg-surface-elevated)" : "transparent",
            color: activeTab === "users" ? "var(--text-primary)" : "var(--text-secondary)",
            border: activeTab === "users" ? "1px solid var(--border-default)" : "1px solid transparent",
          }}
        >
          <Users size={13} /> USERS ({users.length})
        </button>
        <button
          onClick={() => setActiveTab("providers")}
          className="btn btn-ghost"
          style={{
            padding: "5px 12px",
            fontSize: "0.78rem",
            fontFamily: "var(--font-mono)",
            background: activeTab === "providers" ? "var(--bg-surface-elevated)" : "transparent",
            color: activeTab === "providers" ? "var(--text-primary)" : "var(--text-secondary)",
            border: activeTab === "providers" ? "1px solid var(--border-default)" : "1px solid transparent",
          }}
        >
          <Server size={13} /> PROVIDERS ({providers.length})
        </button>
      </div>

      {/* Tab: Overview */}
      {activeTab === "overview" && summary && (
        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          {/* Metrics Bento Row */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "1rem" }}>
            <div className="panel" style={{ padding: "1.25rem", background: "var(--bg-surface)" }}>
              <span className="font-mono" style={{ color: "var(--text-muted)", fontSize: "0.72rem", fontWeight: 600 }}>
                AVERAGE_HEALTH_SCORE
              </span>
              <div
                className="font-mono"
                style={{
                  fontSize: "1.8rem",
                  fontWeight: 800,
                  color: summary.averageHealth >= 80 ? "var(--accent-emerald)" : "var(--accent-amber)",
                  marginTop: 6,
                }}
              >
                {summary.averageHealth}%
              </div>
            </div>

            <div className="panel" style={{ padding: "1.25rem", background: "var(--bg-surface)" }}>
              <span className="font-mono" style={{ color: "var(--text-muted)", fontSize: "0.72rem", fontWeight: 600 }}>
                REGISTERED_USERS
              </span>
              <div className="font-mono" style={{ fontSize: "1.8rem", fontWeight: 800, marginTop: 6 }}>
                {summary.totalUsers}
              </div>
            </div>

            <div className="panel" style={{ padding: "1.25rem", background: "var(--bg-surface)" }}>
              <span className="font-mono" style={{ color: "var(--text-muted)", fontSize: "0.72rem", fontWeight: 600 }}>
                ACTIVE_ROUTERS
              </span>
              <div
                className="font-mono"
                style={{ fontSize: "1.8rem", fontWeight: 800, color: "var(--accent-brand)", marginTop: 6 }}
              >
                {summary.activeProviders} / {summary.providersCount}
              </div>
            </div>
          </div>

          {/* Telemetry Logs Table */}
          <div className="panel" style={{ padding: "1.25rem", background: "var(--bg-surface)" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem" }}>
              <span className="font-mono" style={{ fontSize: "0.82rem", fontWeight: 700, display: "flex", alignItems: "center", gap: 6 }}>
                <AlertTriangle size={14} color="#f59e0b" /> CANARY_FAILURE_TELEMETRY_LOGS
              </span>
            </div>

            {summary.recentFailures?.length > 0 ? (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "0.82rem" }}>
                  <thead>
                    <tr style={{ borderBottom: "1px solid var(--border-default)", color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>
                      <th style={{ padding: "8px 10px" }}>PROVIDER</th>
                      <th style={{ padding: "8px 10px" }}>REPORT_TYPE</th>
                      <th style={{ padding: "8px 10px" }}>ENTITY</th>
                      <th style={{ padding: "8px 10px" }}>TIMESTAMP</th>
                    </tr>
                  </thead>
                  <tbody className="font-mono">
                    {summary.recentFailures.map((f: TelemetryLog, idx: number) => (
                      <tr key={idx} style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                        <td style={{ padding: "8px 10px", fontWeight: 700, color: "var(--text-primary)" }}>{f.providerSlug}</td>
                        <td style={{ padding: "8px 10px" }}>
                          <span className="badge-mono badge-rose">{f.reportType}</span>
                        </td>
                        <td style={{ padding: "8px 10px", color: "var(--text-secondary)" }}>
                          {f.mediaType}#{f.mediaId}
                        </td>
                        <td style={{ padding: "8px 10px", color: "var(--text-muted)" }}>
                          {new Date(f.createdAt).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="font-mono" style={{ color: "var(--text-muted)", fontSize: "0.8rem", padding: "1rem 0" }}>
                [NO_FAILURE_TELEMETRY_RECORDED_IN_24H]
              </p>
            )}
          </div>
        </div>
      )}

      {/* Tab: Invites */}
      {activeTab === "invites" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          {/* Generator Toolbar */}
          <form
            onSubmit={handleGenerateCodes}
            className="panel"
            style={{
              padding: "1rem 1.25rem",
              display: "flex",
              gap: "1rem",
              alignItems: "flex-end",
              flexWrap: "wrap",
              background: "var(--bg-surface)",
            }}
          >
            <div>
              <label className="font-mono" style={{ fontSize: "0.72rem", color: "var(--text-muted)", display: "block", marginBottom: 4 }}>
                BATCH_COUNT
              </label>
              <input
                type="number"
                min={1}
                max={20}
                value={newCodeCount}
                onChange={(e) => setNewCodeCount(parseInt(e.target.value, 10))}
                className="input-field font-mono"
                style={{ width: 100 }}
              />
            </div>
            <div>
              <label className="font-mono" style={{ fontSize: "0.72rem", color: "var(--text-muted)", display: "block", marginBottom: 4 }}>
                TTL_DAYS
              </label>
              <input
                type="number"
                min={1}
                max={90}
                value={newCodeDays}
                onChange={(e) => setNewCodeDays(parseInt(e.target.value, 10))}
                className="input-field font-mono"
                style={{ width: 100 }}
              />
            </div>
            <button type="submit" className="btn btn-primary font-mono" style={{ fontSize: "0.8rem", gap: 6 }}>
              <Plus size={14} /> GENERATE_KEYS
            </button>
          </form>

          {/* Codes Table */}
          <div className="panel" style={{ padding: "1.25rem", overflowX: "auto", background: "var(--bg-surface)" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "0.82rem" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border-default)", color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>
                  <th style={{ padding: "8px 10px" }}>KEY_CODE</th>
                  <th style={{ padding: "8px 10px" }}>STATUS</th>
                  <th style={{ padding: "8px 10px" }}>CREATED</th>
                  <th style={{ padding: "8px 10px" }}>EXPIRES</th>
                  <th style={{ padding: "8px 10px" }}>ACTION</th>
                </tr>
              </thead>
              <tbody className="font-mono">
                {invites.map((c) => (
                  <tr key={c.code} style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                    <td style={{ padding: "8px 10px", fontWeight: 700, color: "var(--accent-brand)" }}>{c.code}</td>
                    <td style={{ padding: "8px 10px" }}>
                      <span className={`badge-mono ${c.status === "active" ? "badge-emerald" : ""}`}>
                        {c.status}
                      </span>
                    </td>
                    <td style={{ padding: "8px 10px", color: "var(--text-muted)" }}>
                      {new Date(c.createdAt).toLocaleDateString()}
                    </td>
                    <td style={{ padding: "8px 10px", color: "var(--text-muted)" }}>
                      {c.expiresAt ? new Date(c.expiresAt).toLocaleDateString() : "NEVER"}
                    </td>
                    <td style={{ padding: "8px 10px" }}>
                      {c.status === "active" && (
                        <button
                          onClick={() => handleRevokeCode(c.code)}
                          className="btn btn-danger"
                          style={{ padding: "2px 8px", fontSize: "0.72rem" }}
                        >
                          Revoke
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab: Users */}
      {activeTab === "users" && (
        <div className="panel" style={{ padding: "1.25rem", overflowX: "auto", background: "var(--bg-surface)" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "0.82rem" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border-default)", color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>
                <th style={{ padding: "8px 10px" }}>USERNAME</th>
                <th style={{ padding: "8px 10px" }}>EMAIL</th>
                <th style={{ padding: "8px 10px" }}>ROLE</th>
                <th style={{ padding: "8px 10px" }}>STATUS</th>
                <th style={{ padding: "8px 10px" }}>JOINED</th>
                <th style={{ padding: "8px 10px" }}>ACTION</th>
              </tr>
            </thead>
            <tbody className="font-mono">
              {users.map((u) => (
                <tr key={u._id || u.username} style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                  <td style={{ padding: "8px 10px", fontWeight: 700, color: "var(--text-primary)" }}>{u.username}</td>
                  <td style={{ padding: "8px 10px", color: "var(--text-secondary)" }}>{u.email}</td>
                  <td style={{ padding: "8px 10px" }}>
                    <span className={`badge-mono ${u.role === "admin" ? "badge-brand" : ""}`}>{u.role}</span>
                  </td>
                  <td style={{ padding: "8px 10px" }}>
                    <span style={{ color: u.isDisabled ? "var(--accent-rose)" : "var(--accent-emerald)" }}>
                      {u.isDisabled ? "SUSPENDED" : "ACTIVE"}
                    </span>
                  </td>
                  <td style={{ padding: "8px 10px", color: "var(--text-muted)" }}>
                    {new Date(u.createdAt).toLocaleDateString()}
                  </td>
                  <td style={{ padding: "8px 10px" }}>
                    {u.role !== "admin" && (
                      <button
                        onClick={() => handleToggleUser(u._id!, u.isDisabled)}
                        className={`btn ${u.isDisabled ? "btn-secondary" : "btn-danger"}`}
                        style={{ padding: "2px 8px", fontSize: "0.72rem" }}
                      >
                        {u.isDisabled ? "Reactivate" : "Suspend"}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Tab: Providers */}
      {activeTab === "providers" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          {/* Add Provider Form */}
          <form onSubmit={handleAddProvider} className="panel" style={{ padding: "1.25rem", background: "var(--bg-surface)" }}>
            <span className="font-mono" style={{ fontSize: "0.82rem", fontWeight: 700, display: "block", marginBottom: 12 }}>
              // REGISTER_NEW_PROVIDER_ENDPOINT
            </span>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.85rem", marginBottom: "1rem" }}>
              <div>
                <label className="font-mono" style={{ fontSize: "0.72rem", color: "var(--text-muted)", display: "block", marginBottom: 4 }}>
                  DISPLAY_NAME
                </label>
                <input
                  type="text"
                  placeholder="e.g. VidSrc"
                  value={newProvider.name}
                  onChange={(e) => setNewProvider({ ...newProvider, name: e.target.value })}
                  className="input-field font-mono"
                  required
                />
              </div>
              <div>
                <label className="font-mono" style={{ fontSize: "0.72rem", color: "var(--text-muted)", display: "block", marginBottom: 4 }}>
                  SLUG_IDENTIFIER
                </label>
                <input
                  type="text"
                  placeholder="e.g. vidsrc"
                  value={newProvider.slug}
                  onChange={(e) => setNewProvider({ ...newProvider, slug: e.target.value })}
                  className="input-field font-mono"
                  required
                />
              </div>
              <div style={{ gridColumn: "span 2" }}>
                <label className="font-mono" style={{ fontSize: "0.72rem", color: "var(--text-muted)", display: "block", marginBottom: 4 }}>
                  BASE_ENDPOINT_URL
                </label>
                <input
                  type="url"
                  placeholder="https://vidsrc.to/embed"
                  value={newProvider.baseUrl}
                  onChange={(e) => setNewProvider({ ...newProvider, baseUrl: e.target.value })}
                  className="input-field font-mono"
                  required
                />
              </div>
              <div>
                <label className="font-mono" style={{ fontSize: "0.72rem", color: "var(--text-muted)", display: "block", marginBottom: 4 }}>
                  MOVIE_PATTERN
                </label>
                <input
                  type="text"
                  value={newProvider.moviePattern}
                  onChange={(e) => setNewProvider({ ...newProvider, moviePattern: e.target.value })}
                  className="input-field font-mono"
                  required
                />
              </div>
              <div>
                <label className="font-mono" style={{ fontSize: "0.72rem", color: "var(--text-muted)", display: "block", marginBottom: 4 }}>
                  TV_PATTERN
                </label>
                <input
                  type="text"
                  value={newProvider.tvPattern}
                  onChange={(e) => setNewProvider({ ...newProvider, tvPattern: e.target.value })}
                  className="input-field font-mono"
                  required
                />
              </div>
            </div>
            <button type="submit" className="btn btn-primary font-mono" style={{ fontSize: "0.8rem", gap: 6 }}>
              <Plus size={14} /> REGISTER_PROVIDER
            </button>
          </form>

          {/* Providers Table */}
          <div className="panel" style={{ padding: "1.25rem", overflowX: "auto", background: "var(--bg-surface)" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "0.82rem" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border-default)", color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>
                  <th style={{ padding: "8px 10px" }}>PROVIDER</th>
                  <th style={{ padding: "8px 10px" }}>SLUG</th>
                  <th style={{ padding: "8px 10px" }}>HEALTH</th>
                  <th style={{ padding: "8px 10px" }}>24H_ERRORS</th>
                  <th style={{ padding: "8px 10px" }}>CIRCUIT_STATUS</th>
                  <th style={{ padding: "8px 10px" }}>ACTION</th>
                </tr>
              </thead>
              <tbody className="font-mono">
                {providers.map((p) => (
                  <tr key={p.slug} style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                    <td style={{ padding: "8px 10px", fontWeight: 700, color: "var(--text-primary)" }}>{p.name}</td>
                    <td style={{ padding: "8px 10px", color: "var(--text-muted)" }}>{p.slug}</td>
                    <td style={{ padding: "8px 10px" }}>
                      <span style={{ color: p.healthScore >= 80 ? "var(--accent-emerald)" : "var(--accent-amber)", fontWeight: 700 }}>
                        {p.healthScore}%
                      </span>
                    </td>
                    <td style={{ padding: "8px 10px" }}>{p.failureCount24h}</td>
                    <td style={{ padding: "8px 10px" }}>
                      <span className={`badge-mono ${p.circuitBreakerTripped ? "badge-rose" : "badge-emerald"}`}>
                        {p.circuitBreakerTripped ? "TRIPPED" : "OPERATIONAL"}
                      </span>
                    </td>
                    <td style={{ padding: "8px 10px" }}>
                      <button
                        onClick={() => handleDeleteProvider(p.slug)}
                        className="btn btn-danger"
                        style={{ padding: "2px 8px", fontSize: "0.72rem" }}
                      >
                        <Trash2 size={11} /> Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      {/* Confirmation Dialog */}
      <ConfirmModal
        isOpen={confirmDialog.isOpen}
        title={confirmDialog.title}
        description={confirmDialog.description}
        confirmText="Confirm Delete"
        cancelText="Cancel"
        loading={actionLoading}
        onConfirm={confirmDialog.action}
        onClose={() => setConfirmDialog((prev) => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
}
