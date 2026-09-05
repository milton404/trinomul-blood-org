"use client";

import { WifiOff, RefreshCw, Droplets, Home } from "lucide-react";

export default function OfflinePage() {
  const handleRetry = () => {
    window.location.reload();
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 px-4">
      <div className="max-w-md w-full text-center">
        {/* Icon */}
        <div className="mb-8 relative">
          <div className="w-24 h-24 mx-auto bg-red-100 rounded-full flex items-center justify-center">
            <WifiOff className="w-12 h-12 text-red-500" />
          </div>
          <div className="absolute -top-2 -right-2 w-10 h-10 bg-yellow-400 rounded-full flex items-center justify-center shadow-lg">
            <span className="text-lg">📵</span>
          </div>
        </div>

        {/* Title */}
        <h1 className="text-3xl font-bold text-slate-900 mb-3">
          You're Offline
        </h1>

        <p className="text-slate-600 mb-8 leading-relaxed">
          It looks like you've lost your internet connection. Don't worry - some
          features may still work with cached data.
        </p>

        {/* Offline Features */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 mb-6">
          <h3 className="font-semibold text-slate-800 mb-4 flex items-center justify-center gap-2">
            <Droplets className="w-5 h-5 text-red-500" />
            Available While Offline
          </h3>
          <ul className="space-y-3 text-left">
            <li className="flex items-center gap-3 text-sm text-slate-600">
              <span className="w-5 h-5 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                ✅
              </span>
              View previously loaded donor information
            </li>
            <li className="flex items-center gap-3 text-sm text-slate-600">
              <span className="w-5 h-5 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                ✅
              </span>
              Access blood compatibility guide
            </li>
            <li className="flex items-center gap-3 text-sm text-slate-600">
              <span className="w-5 h-5 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                ✅
              </span>
              Check donor eligibility (cached)
            </li>
            <li className="flex items-center gap-3 text-sm text-slate-400">
              <span className="w-5 h-5 bg-slate-100 rounded-full flex items-center justify-center flex-shrink-0">
                ⏳
              </span>
              Submit blood requests (queued)
            </li>
            <li className="flex items-center gap-3 text-sm text-slate-400">
              <span className="w-5 h-5 bg-slate-100 rounded-full flex items-center justify-center flex-shrink-0">
                ⏳
              </span>
              Receive notifications (pending)
            </li>
          </ul>
        </div>

        {/* Actions */}
        <div className="space-y-3">
          <button
            onClick={handleRetry}
            className="w-full bg-red-600 text-white py-4 rounded-xl font-semibold hover:bg-red-700 transition-all flex items-center justify-center gap-2 shadow-lg shadow-red-200"
          >
            <RefreshCw className="w-5 h-5" />
            Try Reconnecting
          </button>

          <a
            href="/"
            className="w-full bg-white text-slate-700 border border-slate-200 py-4 rounded-xl font-semibold hover:bg-slate-50 transition-all flex items-center justify-center gap-2"
          >
            <Home className="w-5 h-5" />
            Go to Homepage
          </a>
        </div>

        {/* Tip */}
        <p className="mt-6 text-xs text-slate-400">
          💡 Tip: Your data will sync automatically when you're back online
        </p>
      </div>
    </div>
  );
}
