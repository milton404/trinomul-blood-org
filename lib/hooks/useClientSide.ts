import { useState, useEffect } from 'react';

/**
 * Returns false during SSR and the initial hydration render, then true
 * after the first useEffect runs on the client. Use to gate access to
 * browser-only APIs (window, document, localStorage) and time-sensitive
 * values (Date.now()) so server and client render identical content
 * during hydration, preventing hydration mismatch errors.
 */
export function useClientSide(): boolean {
  const [isClient, setIsClient] = useState(false);
  useEffect(() => setIsClient(true), []);
  return isClient;
}