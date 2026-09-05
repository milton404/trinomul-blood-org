'use client';

import { useState, useEffect } from 'react';
import { Wifi, WifiOff, RefreshCw } from 'lucide-react';

export default function NetworkStatus() {
  const [isOnline, setIsOnline] = useState(true);
  const [showReconnecting, setShowReconnecting] = useState(false);

  useEffect(() => {
    // Set initial state
    setIsOnline(navigator.onLine);

    const handleOnline = () => {
      setIsOnline(true);
      setShowReconnecting(false);
    };

    const handleOffline = () => {
      setIsOnline(false);
      
      // Show "reconnecting" message after 3 seconds
      setTimeout(() => {
        if (!navigator.onLine) {
          setShowReconnecting(true);
        }
      }, 3000);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (isOnline) return null;

  return (
    <div className="fixed top-16 left-0 right-0 z-50 bg-yellow-50 border-b border-yellow-200 px-4 py-2 animate-in slide-in-from-top duration-300">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-3">
          <WifiOff className="w-4 h-4 text-yellow-600 animate-pulse" />
          <span className="text-sm font-medium text-yellow-800">
            You're offline. Some features may be limited.
          </span>
          {showReconnecting && (
            <span className="flex items-center gap-1 text-xs text-yellow-600">
              <RefreshCw className="w-3 h-3 animate-spin" />
              Waiting for connection...
            </span>
          )}
        </div>
        
        <button
          onClick={() => window.location.reload()}
          className="text-sm font-semibold text-yellow-700 hover:text-yellow-900 underline"
        >
          Retry
        </button>
      </div>
    </div>
  );
}
