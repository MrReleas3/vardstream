"use client";

import React from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Home, Film, Tv, Bookmark, Search } from "lucide-react";

export default function MobileBottomNav() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const typeParam = searchParams.get("type");

  // Don't render on welcome / auth pages
  if (pathname === "/welcome" || pathname === "/login" || pathname === "/register") {
    return null;
  }

  const isHome = pathname === "/";
  const isMovies = (pathname === "/search" && typeParam === "movie") || pathname.startsWith("/movie");
  const isTV = (pathname === "/search" && typeParam === "tv") || pathname.startsWith("/tv");
  const isWatchlist = pathname.startsWith("/watchlist");
  const isSearch = pathname === "/search" && !typeParam;

  const navItems = [
    { label: "Home", href: "/", icon: Home, active: isHome },
    { label: "Movies", href: "/search?type=movie", icon: Film, active: isMovies },
    { label: "TV Shows", href: "/search?type=tv", icon: Tv, active: isTV },
    { label: "Watchlist", href: "/watchlist", icon: Bookmark, active: isWatchlist },
    { label: "Search", href: "/search", icon: Search, active: isSearch },
  ];

  return (
    <nav className="mobile-bottom-nav-bar show-on-mobile" aria-label="Mobile Navigation">
      {navItems.map((item) => {
        const Icon = item.icon;
        return (
          <Link
            key={item.label}
            href={item.href}
            className={`mobile-nav-item ${item.active ? "active" : ""}`}
            aria-current={item.active ? "page" : undefined}
          >
            <Icon
              size={18}
              className="nav-icon-indicator"
              strokeWidth={item.active ? 2.5 : 1.75}
            />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
