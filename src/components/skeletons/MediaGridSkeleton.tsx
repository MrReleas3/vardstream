import React from "react";
import MediaCardSkeleton from "./MediaCardSkeleton";

interface MediaGridSkeletonProps {
  count?: number;
  className?: string;
  style?: React.CSSProperties;
}

export default function MediaGridSkeleton({
  count = 12,
  className = "responsive-media-grid",
  style,
}: MediaGridSkeletonProps) {
  const items = Array.from({ length: count }, (_, i) => i);

  return (
    <div className={className} style={style}>
      {items.map((key) => (
        <MediaCardSkeleton key={key} />
      ))}
    </div>
  );
}
