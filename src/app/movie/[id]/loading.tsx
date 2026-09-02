import React from "react";
import DetailBentoSkeleton from "@/components/skeletons/DetailBentoSkeleton";

export default function MovieDetailLoading() {
  return <DetailBentoSkeleton isTv={false} />;
}
