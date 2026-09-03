"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from "react";
import { UserActivity, MediaType } from "@/types";

interface ToggleOptions {
  status?: string;
  isFavorite?: boolean;
}

interface WatchlistContextType {
  activities: UserActivity[];
  watchlistCount: number;
  loading: boolean;
  isQueued: (mediaType: MediaType | string, tmdbId: number) => boolean;
  getActivity: (mediaType: MediaType | string, tmdbId: number) => UserActivity | undefined;
  toggleQueue: (
    item: {
      tmdbId: number;
      mediaType: MediaType | string;
      title: string;
      posterPath?: string | null;
      backdropPath?: string | null;
    },
    options?: ToggleOptions
  ) => Promise<boolean>;
  updateActivityStatus: (
    mediaType: MediaType | string,
    tmdbId: number,
    status: string,
    extra?: Partial<UserActivity>
  ) => Promise<void>;
  refresh: () => Promise<void>;
}

const WatchlistContext = createContext<WatchlistContextType | null>(null);

export function WatchlistProvider({ children }: { children: React.ReactNode }) {
  const [activities, setActivities] = useState<UserActivity[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchActivities = useCallback(async () => {
    try {
      const res = await fetch("/api/activities");
      if (res.ok) {
        const data = await res.json();
        if (data?.ok && Array.isArray(data.data?.activities)) {
          setActivities(data.data.activities);
        }
      }
    } catch (err) {
      console.error("[WatchlistContext] Failed to load activities:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchActivities();
  }, [fetchActivities]);

  // Fast O(1) keyed lookup: "movie:123" or "tv:456"
  const activityMap = useMemo(() => {
    const map = new Map<string, UserActivity>();
    for (const a of activities) {
      const key = `${a.mediaType}:${a.mediaId}`;
      map.set(key, a);
    }
    return map;
  }, [activities]);

  const isQueued = useCallback(
    (mediaType: MediaType | string, tmdbId: number) => {
      const key = `${mediaType}:${tmdbId}`;
      return activityMap.has(key);
    },
    [activityMap]
  );

  const getActivity = useCallback(
    (mediaType: MediaType | string, tmdbId: number) => {
      const key = `${mediaType}:${tmdbId}`;
      return activityMap.get(key);
    },
    [activityMap]
  );

  const toggleQueue = useCallback(
    async (
      item: {
        tmdbId: number;
        mediaType: MediaType | string;
        title: string;
        posterPath?: string | null;
        backdropPath?: string | null;
      },
      options?: ToggleOptions
    ): Promise<boolean> => {
      const type = item.mediaType === "movie" ? "movie" : "tv";
      const key = `${type}:${item.tmdbId}`;
      const currentlyQueued = activityMap.has(key);

      if (currentlyQueued) {
        // Optimistic removal
        setActivities((prev) => prev.filter((a) => !(a.mediaId === item.tmdbId && a.mediaType === type)));
        try {
          const res = await fetch(`/api/activities/${type}/${item.tmdbId}`, {
            method: "DELETE",
          });
          if (!res.ok) {
            // Revert on failure
            fetchActivities();
            return true;
          }
        } catch {
          fetchActivities();
          return true;
        }
        return false; // Now not queued
      } else {
        // Optimistic addition
        const newStatus = options?.status || "plan_to_watch";
        const newActivity: UserActivity = {
          _id: `temp-${Date.now()}`,
          userId: "current-user",
          mediaId: item.tmdbId,
          mediaType: type,
          status: newStatus as any,
          isFavorite: options?.isFavorite || false,
          progress: { timestampSeconds: 0 },
          title: item.title,
          posterPath: item.posterPath,
          backdropPath: item.backdropPath,
          updatedAt: new Date().toISOString(),
          createdAt: new Date().toISOString(),
        };

        setActivities((prev) => [newActivity, ...prev]);

        try {
          const res = await fetch(`/api/activities/${type}/${item.tmdbId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              status: newStatus,
              isFavorite: options?.isFavorite || false,
              title: item.title,
              posterPath: item.posterPath,
              backdropPath: item.backdropPath,
            }),
          });
          if (!res.ok) {
            fetchActivities();
            return false;
          }
        } catch {
          fetchActivities();
          return false;
        }
        return true; // Now queued
      }
    },
    [activityMap, fetchActivities]
  );

  const updateActivityStatus = useCallback(
    async (
      mediaType: MediaType | string,
      tmdbId: number,
      status: string,
      extra?: Partial<UserActivity>
    ) => {
      const type = mediaType === "movie" ? "movie" : "tv";
      const now = new Date().toISOString();

      // Optimistic update
      setActivities((prev) =>
        prev.map((a) => {
          if (a.mediaId === tmdbId && a.mediaType === type) {
            return {
              ...a,
              status: status as any,
              ...(extra?.isFavorite !== undefined && { isFavorite: extra.isFavorite }),
              ...(extra?.progress && { progress: { ...a.progress, ...extra.progress } }),
              updatedAt: now,
            };
          }
          return a;
        })
      );

      try {
        await fetch(`/api/activities/${type}/${tmdbId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            status,
            ...extra,
          }),
        });
      } catch (err) {
        console.error("[WatchlistContext] updateActivityStatus error:", err);
        fetchActivities();
      }
    },
    [fetchActivities]
  );

  const value = useMemo(
    () => ({
      activities,
      watchlistCount: activities.length,
      loading,
      isQueued,
      getActivity,
      toggleQueue,
      updateActivityStatus,
      refresh: fetchActivities,
    }),
    [activities, loading, isQueued, getActivity, toggleQueue, updateActivityStatus, fetchActivities]
  );

  return <WatchlistContext.Provider value={value}>{children}</WatchlistContext.Provider>;
}

export function useWatchlist() {
  const ctx = useContext(WatchlistContext);
  if (!ctx) {
    throw new Error("useWatchlist must be used within a WatchlistProvider");
  }
  return ctx;
}
