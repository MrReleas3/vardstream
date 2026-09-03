"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { Film, Tv, Bookmark, Shield, Search, LogOut, Settings, Key } from "lucide-react";
import { AuthSessionUser } from "@/types";

export default function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const [searchQuery, setSearchQuery] = useState("");
  const [user, setUser] = useState<AuthSessionUser | null>(null);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

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

  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setUserMenuOpen(false);
      }
    }
    if (userMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [userMenuOpen]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
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
              VARD<span style={{ color: "var(--text-muted)", fontWeight: 500 }}>{"//"}STREAM</span>
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

        {/* Right Side: Desktop Search + User Profile Dropdown (Visible on Both Desktop & Mobile) */}
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
                className="input-field font-mono glow-focus"
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
            <div ref={menuRef} style={{ position: "relative" }}>
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
                aria-label="User profile and settings"
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
                  className="panel font-mono"
                  style={{
                    position: "absolute",
                    right: 0,
                    top: "125%",
                    width: 195,
                    padding: "4px",
                    boxShadow: "0 10px 30px rgba(0,0,0,0.8)",
                    display: "flex",
                    flexDirection: "column",
                    gap: "2px",
                    zIndex: 100,
                    background: "var(--bg-surface-elevated)",
                  }}
                >
                  <div style={{ padding: "6px 8px", borderBottom: "1px solid var(--border-default)", marginBottom: 4 }}>
                    <div style={{ fontSize: "0.68rem", color: "var(--text-muted)" }}>Signed in as</div>
                    <div className="font-mono" style={{ fontSize: "0.75rem", fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {user.email}
                    </div>
                  </div>

                  {user.role === "admin" && (
                    <Link
                      href="/admin"
                      onClick={() => setUserMenuOpen(false)}
                      className="btn btn-ghost"
                      style={{ justifyContent: "flex-start", padding: "5px 8px", fontSize: "0.75rem", gap: 6, color: "#a5b4fc" }}
                    >
                      <Shield size={13} /> Admin Panel
                    </Link>
                  )}

                  <Link
                    href="/settings"
                    onClick={() => setUserMenuOpen(false)}
                    className="btn btn-ghost"
                    style={{ justifyContent: "flex-start", padding: "5px 8px", fontSize: "0.75rem", gap: 6 }}
                  >
                    <Settings size={13} /> Preferences
                  </Link>
                  <button
                    onClick={() => {
                      setUserMenuOpen(false);
                      handleLogout();
                    }}
                    className="btn btn-ghost"
                    style={{ justifyContent: "flex-start", padding: "5px 8px", fontSize: "0.75rem", gap: 6, color: "var(--accent-rose)", width: "100%" }}
                  >
                    <LogOut size={13} /> Log out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
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
        </div>
      </div>
    </header>
  );
}
