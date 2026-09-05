"use client";

import { useEffect, useRef } from "react";
import { serverUpdateLastActive } from "@/lib/db-actions";

/**
 * Silent presence tracker. Calls `serverUpdateLastActive` on mount and
 * every 5 minutes while the tab is visible. Renders nothing.
 *
 * The server action is throttled to once per 4 minutes in the DB layer,
 * so duplicate calls (e.g., from re-mounts) are cheap no-ops.
 */
export default function PresenceHeartbeat() {
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const ping = () => {
      if (typeof document !== "undefined" && document.visibilityState === "visible") {
        serverUpdateLastActive().catch(() => {});
      }
    };

    ping();

    intervalRef.current = setInterval(ping, 5 * 60 * 1000);

    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        ping();
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, []);

  return null;
}