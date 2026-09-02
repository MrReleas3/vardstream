"use client";

import React, { useState, useEffect, useRef } from "react";
import { Play, Bookmark, CheckCircle2, Heart, Pause, Trash2, Plus, Check, ChevronDown, RefreshCw } from "lucide-react";
import { MediaStatus, MediaType } from "@/types";
import ConfirmModal from "./ConfirmModal";

interface WatchlistDropdownProps {
  mediaType: MediaType;
  tmdbId: number;
  title: string;
  posterPath?: string | null;
  backdropPath?: string | null;
  initialStatus?: MediaStatus | null;
  initialFavorite?: boolean;
  variant?: "button" | "icon";
  placement?: "top" | "bottom";
  onStatusChange?: (status: MediaStatus | null, isFavorite: boolean) => void;
}

const STATUS_CHOICES = [
  { id: "watching", label: "Watching", icon: Play, color: "var(--accent-emerald)" },
  { id: "plan_to_watch", label: "Planning", icon: Bookmark, color: "var(--accent-brand)" },
  { id: "completed", label: "Completed", icon: CheckCircle2, color: "#60a5fa" },
  { id: "paused", label: "Paused", icon: Pause, color: "var(--accent-amber)" },
] as const;

export default function WatchlistDropdown({
  mediaType,
  tmdbId,
  title,
  posterPath,
  backdropPath,
  initialStatus = null,
  initialFavorite = false,
  variant = "button",
  placement = "bottom",
  onStatusChange,
}: WatchlistDropdownProps) {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<MediaStatus | null>(initialStatus);
  const [isFavorite, setIsFavorite] = useState<boolean>(initialFavorite);
  const [loading, setLoading] = useState(false);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close when clicking outside or pressing Escape
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  // Update activity status
  const handleSelectStatus = async (newStatus: MediaStatus, e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setLoading(true);

    try {
      const res = await fetch(`/api/activities/${mediaType}/${tmdbId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: newStatus,
          isFavorite,
          title,
          posterPath,
          backdropPath,
        }),
      });

      if (res.ok) {
        setStatus(newStatus);
        onStatusChange?.(newStatus, isFavorite);
      }
    } catch (err) {
      console.error(err);
    }

    setLoading(false);
    setOpen(false);
  };

  // Toggle favorite
  const handleToggleFavorite = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setLoading(true);
    const nextFavorite = !isFavorite;

    try {
      const res = await fetch(`/api/activities/${mediaType}/${tmdbId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: status || "plan_to_watch",
          isFavorite: nextFavorite,
          title,
          posterPath,
          backdropPath,
        }),
      });

      if (res.ok) {
        setIsFavorite(nextFavorite);
        if (!status) setStatus("plan_to_watch");
        onStatusChange?.(status || "plan_to_watch", nextFavorite);
      }
    } catch (err) {
      console.error(err);
    }

    setLoading(false);
  };

  // Confirmed Delete execution
  const executeDelete = async () => {
    setLoading(true);

    try {
      const res = await fetch(`/api/activities/${mediaType}/${tmdbId}`, {
        method: "DELETE",
      });

      if (res.ok) {
        setStatus(null);
        setIsFavorite(false);
        onStatusChange?.(null, false);
      }
    } catch (err) {
      console.error(err);
    }

    setLoading(false);
    setShowConfirmDelete(false);
    setOpen(false);
  };

  const getStatusLabel = () => {
    if (!status) return "Add to Watchlist";
    if (status === "watching") return "Watching";
    if (status === "plan_to_watch") return "Planning";
    if (status === "completed") return "Completed";
    if (status === "paused") return "Paused";
    return "In Watchlist";
  };

  const isSaved = status !== null || isFavorite;

  return (
    <>
      <div
        ref={dropdownRef}
        style={{ position: "relative", display: "inline-block" }}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
      >
        {/* Trigger Button Variant */}
        {variant === "button" ? (
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setOpen(!open);
            }}
            disabled={loading}
            className="btn btn-secondary"
            style={{
              padding: "7px 14px",
              fontSize: "0.82rem",
              gap: 6,
              fontFamily: "var(--font-sans)",
              borderColor: isSaved ? "var(--border-strong)" : undefined,
              background: isSaved ? "var(--bg-surface-elevated)" : "var(--bg-surface)",
            }}
          >
            {loading ? (
              <RefreshCw size={13} className="animate-spin" />
            ) : isSaved ? (
              <>
                <Check size={13} strokeWidth={2.5} color="var(--accent-emerald)" />
                <span>{getStatusLabel()}</span>
                {isFavorite && <Heart size={11} fill="#fb7185" color="#fb7185" />}
                <ChevronDown size={12} style={{ opacity: 0.7, marginLeft: 2 }} />
              </>
            ) : (
              <>
                <Plus size={13} />
                <span>Add to Watchlist</span>
                <ChevronDown size={12} style={{ opacity: 0.7, marginLeft: 2 }} />
              </>
            )}
          </button>
        ) : (
          /* Icon Variant for Media Cards */
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setOpen(!open);
            }}
            disabled={loading}
            title={isSaved ? `Watchlist: ${getStatusLabel()}` : "+ Add to Watchlist"}
            style={{
              width: 22,
              height: 22,
              borderRadius: "var(--radius-xs)",
              background: isSaved ? "var(--text-primary)" : "rgba(9, 9, 11, 0.85)",
              border: "1px solid var(--border-default)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: isSaved ? "var(--text-inverse)" : "var(--text-secondary)",
              cursor: "pointer",
              zIndex: 10,
            }}
          >
            {loading ? (
              <RefreshCw size={10} className="animate-spin" />
            ) : isSaved ? (
              <Check size={11} strokeWidth={3} />
            ) : (
              <Bookmark size={10} />
            )}
          </button>
        )}

        {/* Popover / Dropdown Menu */}
        {open && (
          <div
            className="panel animate-fade-in font-mono"
            style={{
              position: "absolute",
              bottom: placement === "top" ? "calc(100% + 6px)" : undefined,
              top: placement === "bottom" ? "calc(100% + 6px)" : undefined,
              left: variant === "button" ? 0 : undefined,
              right: variant === "icon" ? 0 : undefined,
              width: 195,
              padding: "4px",
              background: "#18181b",
              border: "1px solid var(--border-strong)",
              boxShadow: "0 16px 40px rgba(0,0,0,0.95)",
              zIndex: 99999,
              display: "flex",
              flexDirection: "column",
              gap: "2px",
            }}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
          >
            <div
              style={{
                padding: "5px 8px",
                fontSize: "0.68rem",
                color: "var(--text-muted)",
                borderBottom: "1px solid var(--border-subtle)",
                marginBottom: "2px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <span>WATCHLIST_STATUS</span>
            </div>

            {/* Status Items: Watching, Planning, Completed, Paused */}
            {STATUS_CHOICES.map((choice) => {
              const Icon = choice.icon;
              const isCurrent = status === choice.id;

              return (
                <button
                  key={choice.id}
                  type="button"
                  onClick={(e) => handleSelectStatus(choice.id as MediaStatus, e)}
                  className="btn btn-ghost"
                  style={{
                    justifyContent: "space-between",
                    padding: "6px 8px",
                    fontSize: "0.75rem",
                    color: isCurrent ? "#ffffff" : "var(--text-secondary)",
                    background: isCurrent ? "var(--bg-subtle)" : "transparent",
                    border: isCurrent ? "1px solid var(--border-default)" : "1px solid transparent",
                    width: "100%",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                    <Icon size={12} color={choice.color} />
                    <span>{choice.label}</span>
                  </div>
                  {isCurrent && <Check size={11} color="var(--accent-emerald)" strokeWidth={3} />}
                </button>
              );
            })}

            <div className="divider" style={{ margin: "2px 0" }} />

            {/* Favs Choice */}
            <button
              type="button"
              onClick={handleToggleFavorite}
              className="btn btn-ghost"
              style={{
                justifyContent: "space-between",
                padding: "6px 8px",
                fontSize: "0.75rem",
                color: isFavorite ? "#fb7185" : "var(--text-secondary)",
                background: isFavorite ? "rgba(244, 63, 94, 0.1)" : "transparent",
                width: "100%",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                <Heart size={12} fill={isFavorite ? "#fb7185" : "none"} color="#fb7185" />
                <span>Favorite</span>
              </div>
              {isFavorite && <Check size={11} color="#fb7185" strokeWidth={3} />}
            </button>

            {/* Remove Option with Modal Confirmation */}
            {isSaved && (
              <>
                <div className="divider" style={{ margin: "2px 0" }} />
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setShowConfirmDelete(true);
                  }}
                  className="btn btn-ghost"
                  style={{
                    justifyContent: "flex-start",
                    padding: "6px 8px",
                    fontSize: "0.72rem",
                    color: "var(--accent-rose)",
                    gap: 7,
                    width: "100%",
                  }}
                >
                  <Trash2 size={11} />
                  <span>Remove from Watchlist</span>
                </button>
              </>
            )}
          </div>
        )}
      </div>

      {/* Confirmation Dialog */}
      <ConfirmModal
        isOpen={showConfirmDelete}
        title="CONFIRM_REMOVAL"
        description={`Are you sure you want to remove "${title}" from your watchlist and activity records?`}
        confirmText="Remove Entry"
        cancelText="Keep in List"
        loading={loading}
        onConfirm={executeDelete}
        onClose={() => setShowConfirmDelete(false)}
      />
    </>
  );
}
