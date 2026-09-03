"use client";

import React, { Suspense } from "react";
import SearchScreen from "../page";

export default function SearchPage() {
  return (
    <Suspense fallback={null}>
      <SearchScreen />
    </Suspense>
  );
}
