"use client";

import { useEffect, useState } from "react";
import { BloodDropLoading } from "@/components/ui/BloodDropLoading";

export default function GlobalLoading() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), 120);
    return () => clearTimeout(timer);
  }, []);

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/85 backdrop-blur-md p-6">
      <BloodDropLoading
        label="Loading"
        sublabel="Trinomul Blood Bank Rangpur"
        size={96}
      />
    </div>
  );
}
