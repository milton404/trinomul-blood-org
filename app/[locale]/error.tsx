'use client';

import { useEffect } from 'react';
import { AlertTriangle, RefreshCw, Home, ArrowLeft } from 'lucide-react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Application error:', error);
    console.error('Error digest:', error.digest);
    console.error('Stack:', error.stack);
    console.error('Message:', error.message);

  }, [error]);

  const isNetworkError = error.message?.toLowerCase().includes('network') || 
                         error.message?.toLowerCase().includes('fetch');
  const isAuthError = error.message?.toLowerCase().includes('auth') || 
                      error.message?.toLowerCase().includes('unauthorized');

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="max-w-md w-full text-center">
        <div className="mb-6 flex justify-center">
          <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center">
            <AlertTriangle className="w-10 h-10 text-red-600" />
          </div>
        </div>

        <h2 className="text-3xl font-bold text-slate-900 mb-3">
          Something went wrong!
        </h2>
        
        <p className="text-slate-500 mb-6 text-sm leading-relaxed">
          {isNetworkError && "We couldn't connect to our servers. Please check your internet connection and try again."}
          {isAuthError && "Your session has expired or you don't have permission. Please log in again."}
          {!isNetworkError && !isAuthError && "We encountered an unexpected error. Please try again or go back to the home page."}
        </p>

        {error.digest && (
          <p className="text-xs text-slate-400 mb-6 font-mono bg-slate-100 rounded-lg p-3">
            Error ID: {error.digest}
          </p>
        )}

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={reset}
            className="bg-red-600 text-white px-8 py-3 rounded-full font-semibold hover:bg-red-700 transition-all flex items-center justify-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Try Again
          </button>
          
          <a
            href="/"
            className="bg-white text-slate-700 border border-slate-200 px-8 py-3 rounded-full font-semibold hover:bg-slate-50 transition-all flex items-center justify-center gap-2"
          >
            <Home className="w-4 h-4" />
            Go Home
          </a>
        </div>

        <button
          onClick={() => window.history.back()}
          className="mt-4 text-sm text-slate-500 hover:text-red-600 transition-colors inline-flex items-center gap-1"
        >
          <ArrowLeft className="w-3 h-3" />
          Go Back
        </button>
      </div>
    </div>
  );
}
