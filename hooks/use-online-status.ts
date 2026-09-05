"use client";

import { useEffect, useState } from "react";

/**
 * Tracks the browser's online/offline status via `navigator.onLine` and the
 * `online`/`offline` window events. Returns `true` when online.
 *
 * Used by map components to show a fallback banner when the device loses
 * connectivity — cached OSM tiles still render, but unvisited areas appear
 * grey, so the user needs to know why.
 */
export function useOnlineStatus(): boolean {
  const [isOnline, setIsOnline] = useState<boolean>(true);

  useEffect(() => {
    // Sync with the real status on mount (SSR defaults to online).
    setIsOnline(navigator.onLine);

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  return isOnline;
}
