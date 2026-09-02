"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { Film, Tv, Bookmark, Shield, Search, LogOut, Settings, Key, Menu, X } from "lucide-react";
import { AuthSessionUser } from "@/types";

export default function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const [searchQuery, setSearchQuery] = useState("");
  const [user, setUser] = useState<AuthSessionUser | null>(null);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    let isMounted = true;
    fetch("/api/auth/me")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!isMounted) return;
        if (data?.ok && data.data) {
          setUser({
            userId: data.data.userId,
            email: data.data.email,
            username: data.data.username,
            role: data.data.role,
          });
        } else {
          setUser(null);
        }
      })
      .catch(() => {
        if (isMounted) setUser(null);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  // Close menus on route change
  useEffect(() => {
    setUserMenuOpen(false);
    setMobileMenuOpen(false);
  }, [pathname]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
      setMobileMenuOpen(false);
    }
  };

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    setUser(null);
    router.push("/welcome");
  };

  const isWelcomePage = pathname === "/welcome" || pathname === "/login" || pathname === "/register";

  return (
    <header className="nav-header" style={{ position: "sticky", top: 0, zIndex: 50, width: "100%", height: "54px" }}>
      <div
        style={{
          maxWidth: 1440,
          margin: "0 auto",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 1rem",
          gap: "1rem",
        }}
      >
        {/* Left Side: Brand & Desktop Nav Links */}
        <div style={{ display: "flex", alignItems: "center", gap: "1.5rem" }}>
          <Link
            href={user ? "/" : "/welcome"}
            style={{ display: "flex", alignItems: "center", gap: "0.4rem", textDecoration: "none" }}
          >
            <div
              style={{
                width: 24,
                height: 24,
                borderRadius: "var(--radius-xs)",
                background: "var(--text-primary)",
                color: "var(--text-inverse)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: 800,
                fontSize: "0.78rem",
                fontFamily: "var(--font-mono)",
              }}
            >
              V
            </div>
            <span style={{ fontSize: "0.9rem", fontWeight: 700, letterSpacing: "-0.02em", color: "var(--text-primary)" }}>
              VARD<span style={{ color: "var(--text-muted)", fontWeight: 500 }}>//STREAM</span>
            </span>
          </Link>

          {/* Desktop Navigation Links */}
          {!isWelcomePage && (
            <nav className="hide-on-mobile" style={{ alignItems: "center", gap: "0.25rem" }}>
              <Link
                href="/"
                className="btn btn-ghost"
                style={{
                  fontSize: "0.8rem",
                  color: pathname === "/" ? "var(--text-primary)" : "var(--text-secondary)",
                  background: pathname === "/" ? "var(--bg-surface-elevated)" : "transparent",
                  border: pathname === "/" ? "1px solid var(--border-default)" : "1px solid transparent",
                  padding: "4px 8px",
                }}
              >
                Home
              </Link>
              <Link
                href="/movie"
                className="btn btn-ghost"
                style={{
                  fontSize: "0.8rem",
                  color: pathname.startsWith("/movie") ? "var(--text-primary)" : "var(--text-secondary)",
                  background: pathname.startsWith("/movie") ? "var(--bg-surface-elevated)" : "transparent",
                  border: pathname.startsWith("/movie") ? "1px solid var(--border-default)" : "1px solid transparent",
                  padding: "4px 8px",
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                }}
              >
                <Film size={12} /> Movies
              </Link>
              <Link
                href="/tv"
                className="btn btn-ghost"
                style={{
                  fontSize: "0.8rem",
                  color: pathname.startsWith("/tv") ? "var(--text-primary)" : "var(--text-secondary)",
                  background: pathname.startsWith("/tv") ? "var(--bg-surface-elevated)" : "transparent",
                  border: pathname.startsWith("/tv") ? "1px solid var(--border-default)" : "1px solid transparent",
                  padding: "4px 8px",
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                }}
              >
                <Tv size={12} /> TV & Anime
              </Link>
              <Link
                href="/watchlist"
                className="btn btn-ghost"
                style={{
                  fontSize: "0.8rem",
                  color: pathname === "/watchlist" ? "var(--text-primary)" : "var(--text-secondary)",
                  background: pathname === "/watchlist" ? "var(--bg-surface-elevated)" : "transparent",
                  border: pathname === "/watchlist" ? "1px solid var(--border-default)" : "1px solid transparent",
                  padding: "4px 8px",
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                }}
              >
                <Bookmark size={12} /> Watchlist
              </Link>
              {user?.role === "admin" && (
                <Link
                  href="/admin"
                  className="btn"
                  style={{
                    fontSize: "0.75rem",
                    fontFamily: "var(--font-mono)",
                    color: "#a5b4fc",
                    background: "var(--accent-brand-subtle)",
                    border: "1px solid rgba(99, 102, 241, 0.3)",
                    padding: "3px 7px",
                  }}
                >
                  <Shield size={11} /> ADMIN
                </Link>
              )}
            </nav>
          )}
        </div>

        {/* Right Side: Desktop Search + User Controls */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          {!isWelcomePage && (
            <form onSubmit={handleSearch} className="hide-on-mobile" style={{ position: "relative", width: 200 }}>
              <Search
                size={13}
                style={{
                  position: "absolute",
                  left: 9,
                  top: "50%",
                  transform: "translateY(-50%)",
                  color: "var(--text-muted)",
                }}
              />
              <input
                type="text"
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="input-field font-mono"
                style={{
                  paddingLeft: 28,
                  paddingRight: 24,
                  paddingTop: 4,
                  paddingBottom: 4,
                  fontSize: "0.78rem",
                  height: "28px",
                  background: "var(--bg-surface)",
                }}
              />
              <span
                style={{
                  position: "absolute",
                  right: 6,
                  top: "50%",
                  transform: "translateY(-50%)",
                  color: "var(--text-muted)",
                  fontSize: "0.65rem",
                  fontFamily: "var(--font-mono)",
                }}
              >
                /
              </span>
            </form>
          )}

          {user ? (
            <div className="hide-on-mobile" style={{ position: "relative" }}>
              <button
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="btn btn-secondary"
                style={{
                  padding: "3px 8px",
                  fontSize: "0.78rem",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  height: "28px",
                }}
              >
                <div
                  style={{
                    width: 16,
                    height: 16,
                    borderRadius: "var(--radius-xs)",
                    background: "var(--border-strong)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "0.65rem",
                    color: "var(--text-primary)",
                    fontWeight: 700,
                    fontFamily: "var(--font-mono)",
                  }}
                >
                  {user.username.charAt(0).toUpperCase()}
                </div>
                <span className="font-mono" style={{ fontSize: "0.75rem" }}>{user.username}</span>
              </button>

              {userMenuOpen && (
                <div
                  className="panel"
                  style={{
                    position: "absolute",
                    right: 0,
                    top: "125%",
                    width: 180,
                    padding: "4px",
                    boxShadow: "0 10px 25px rgba(0,0,0,0.6)",
                    display: "flex",
                    flexDirection: "column",
                    gap: "2px",
                    zIndex: 100,
                    background: "var(--bg-surface-elevated)",
                  }}
                >
                  <div style={{ padding: "6px 8px", borderBottom: "1px solid var(--border-default)", marginBottom: 4 }}>
                    <div style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>Signed in as</div>
                    <div className="font-mono" style={{ fontSize: "0.75rem", fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {user.email}
                    </div>
                  </div>

                  <Link
                    href="/settings"
                    onClick={() => setUserMenuOpen(false)}
                    className="btn btn-ghost"
                    style={{ justifyContent: "flex-start", padding: "5px 8px", fontSize: "0.78rem", gap: 6 }}
                  >
                    <Settings size={13} /> Preferences
                  </Link>
                  <button
                    onClick={() => {
                      setUserMenuOpen(false);
                      handleLogout();
                    }}
                    className="btn btn-ghost"
                    style={{ justifyContent: "flex-start", padding: "5px 8px", fontSize: "0.78rem", gap: 6, color: "var(--accent-rose)", width: "100%" }}
                  >
                    <LogOut size={13} /> Log out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="hide-on-mobile" style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
              <Link
                href="/register"
                className="btn btn-outline"
                style={{ padding: "3px 8px", fontSize: "0.75rem", height: "28px" }}
              >
                <Key size={11} /> Invite
              </Link>
              <Link
                href="/login"
                className="btn btn-primary"
                style={{ padding: "3px 10px", fontSize: "0.75rem", height: "28px" }}
              >
                Sign In
              </Link>
            </div>
          )}

          {/* Mobile Hamburger Toggle Button */}
          {!isWelcomePage && (
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="btn btn-secondary show-on-mobile"
              style={{ width: 32, height: 32, padding: 0 }}
              aria-label="Toggle Navigation Menu"
            >
              {mobileMenuOpen ? <X size={16} /> : <Menu size={16} />}
            </button>
          )}
        </div>
      </div>

      {/* Mobile Collapsible Navigation Drawer */}
      {mobileMenuOpen && !isWelcomePage && (
        <div
          className="panel show-on-mobile animate-fade-in"
          style={{
            position: "absolute",
            top: "54px",
            left: 0,
            right: 0,
            background: "var(--bg-surface)",
            borderBottom: "1px solid var(--border-default)",
            padding: "1rem",
            flexDirection: "column",
            gap: "0.75rem",
            zIndex: 100,
            boxShadow: "0 20px 40px rgba(0,0,0,0.8)",
          }}
        >
          {/* Mobile Search Input */}
          <form onSubmit={handleSearch} style={{ position: "relative", width: "100%" }}>
            <Search
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
              type="text"
              placeholder="Search movies, tv series..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input-field font-mono"
              style={{ paddingLeft: 32, fontSize: "0.82rem", height: "32px", background: "var(--bg-subtle)" }}
            />
          </form>

          {/* Nav Links Grid */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.4rem" }}>
            <Link
              href="/"
              onClick={() => setMobileMenuOpen(false)}
              className="btn btn-secondary"
              style={{ justifyContent: "flex-start", padding: "8px 10px", fontSize: "0.82rem" }}
            >
              Home
            </Link>
            <Link
              href="/movie"
              onClick={() => setMobileMenuOpen(false)}
              className="btn btn-secondary"
              style={{ justifyContent: "flex-start", padding: "8px 10px", fontSize: "0.82rem", gap: 6 }}
            >
              <Film size={13} /> Movies
            </Link>
            <Link
              href="/tv"
              onClick={() => setMobileMenuOpen(false)}
              className="btn btn-secondary"
              style={{ justifyContent: "flex-start", padding: "8px 10px", fontSize: "0.82rem", gap: 6 }}
            >
              <Tv size={13} /> TV & Anime
            </Link>
            <Link
              href="/watchlist"
              onClick={() => setMobileMenuOpen(false)}
              className="btn btn-secondary"
              style={{ justifyContent: "flex-start", padding: "8px 10px", fontSize: "0.82rem", gap: 6 }}
            >
              <Bookmark size={13} /> Watchlist
            </Link>
          </div>

          {user?.role === "admin" && (
            <Link
              href="/admin"
              onClick={() => setMobileMenuOpen(false)}
              className="btn"
              style={{
                justifyContent: "center",
                padding: "8px",
                fontSize: "0.8rem",
                fontFamily: "var(--font-mono)",
                color: "#a5b4fc",
                background: "var(--accent-brand-subtle)",
                border: "1px solid rgba(99, 102, 241, 0.3)",
              }}
            >
              <Shield size={13} /> ADMIN COMMAND CENTER
            </Link>
          )}

          <div className="divider" style={{ margin: "0.25rem 0" }} />

          {/* User Status / Account Controls */}
          {user ? (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <div
                  style={{
                    width: 20,
                    height: 20,
                    borderRadius: "var(--radius-xs)",
                    background: "var(--border-strong)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "0.7rem",
                    color: "var(--text-primary)",
                    fontWeight: 700,
                    fontFamily: "var(--font-mono)",
                  }}
                >
                  {user.username.charAt(0).toUpperCase()}
                </div>
                <span className="font-mono" style={{ fontSize: "0.8rem" }}>{user.username}</span>
              </div>

              <div style={{ display: "flex", gap: "0.35rem" }}>
                <Link
                  href="/settings"
                  onClick={() => setMobileMenuOpen(false)}
                  className="btn btn-outline"
                  style={{ padding: "4px 8px", fontSize: "0.75rem" }}
                >
                  <Settings size={12} /> Config
                </Link>
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    handleLogout();
                  }}
                  className="btn btn-danger"
                  style={{ padding: "4px 8px", fontSize: "0.75rem" }}
                >
                  <LogOut size={12} />
                </button>
              </div>
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem" }}>
              <Link
                href="/register"
                onClick={() => setMobileMenuOpen(false)}
                className="btn btn-outline"
                style={{ padding: "8px", fontSize: "0.8rem" }}
              >
                <Key size={12} /> Invite Key
              </Link>
              <Link
                href="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="btn btn-primary"
                style={{ padding: "8px", fontSize: "0.8rem" }}
              >
                Sign In
              </Link>
            </div>
          )}
        </div>
      )}
    </header>
  );
}
