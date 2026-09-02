import React from "react";

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
  variant?: "shimmer" | "pulse";
}

export function Skeleton({
  className = "",
  variant = "shimmer",
  style,
  ...props
}: SkeletonProps) {
  const baseClass = variant === "pulse" ? "skeleton-pulse" : "skeleton";
  return (
    <div
      className={`${baseClass} ${className}`}
      style={{
        border: "1px solid var(--border-subtle, #18191e)",
        ...style,
      }}
      {...props}
    />
  );
}

export default Skeleton;
