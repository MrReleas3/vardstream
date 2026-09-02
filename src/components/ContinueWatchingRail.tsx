"use client";

import React, { useState, useEffect } from "react";
import MediaRail from "./MediaRail";
import MediaRailSkeleton from "./skeletons/MediaRailSkeleton";
import { UserActivity } from "@/types";

export default function ContinueWatchingRail() {
  const [activities, setActivities] = useState<UserActivity[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let isMounted = true;
    fetch("/api/activities/continue-watching")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (isMounted && data?.ok && data.data?.continueWatching) {
          setActivities(data.data.continueWatching);
        }
        if (isMounted) setLoaded(true);
      })
      .catch(() => {
        if (isMounted) setLoaded(true);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const handleRemoveItem = (mediaId: number) => {
    setActivities((prev) => prev.filter((a) => a.mediaId !== mediaId));
  };

  if (!loaded) {
    return <MediaRailSkeleton titleWidth={160} count={6} />;
  }

  if (activities.length === 0) {
    return null;
  }

  return (
    <MediaRail
      title="Continue Watching"
      subtitle="active_sessions"
      items={activities}
      showProgress={true}
      onRemoveItem={handleRemoveItem}
    />
  );
}

