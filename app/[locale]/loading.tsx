"use client";

import { useEffect, useState } from "react";
import { BloodDropLoading } from "@/components/ui/BloodDropLoading";
import { StatsBarSkeleton, CardGridSkeleton } from "@/components/ui/Skeleton";

export default function GlobalLoading() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), 120);
    return () => clearTimeout(timer);
  }, []);

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/80 backdrop-blur-sm overflow-y-auto">
      <div className="w-full max-w-3xl space-y-8 p-4">
        <BloodDropLoading
          label="Loading"
          sublabel="Trinomul Blood Bank Rangpur"
          size={88}
        />
        <StatsBarSkeleton count={4} />
        <CardGridSkeleton count={6} />
      </div>
    </div>
  );
}