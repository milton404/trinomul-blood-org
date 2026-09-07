'use client';

import { useState, useEffect } from 'react';
import { Download, X, Smartphone, Monitor, Wifi, ExternalLink } from 'lucide-react';
import { Link } from '@/i18n/routing';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const SHOW_COUNT_KEY = 'pwa-install-show-count';
const SHOW_DATE_KEY = 'pwa-install-show-date';
const DISMISS_KEY = 'pwa-install-dismissed';
const INSTALLED_KEY = 'pwa-installed';
const MAX_SHOWS_PER_DAY = 3;

export default function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (window.matchMedia('(display-mode: standalone)').matches || localStorage.getItem(INSTALLED_KEY) === 'true') {
      setIsInstalled(true);
      return;
    }

    const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent) ||
                        (navigator.userAgent.includes('Mac') && navigator.maxTouchPoints > 1);
    setIsIOS(isIOSDevice);

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handler);

    const wasDismissed = localStorage.getItem(DISMISS_KEY);
    if (wasDismissed) {
      const dismissTime = parseInt(wasDismissed, 10);
      const hoursSinceDismiss = (Date.now() - dismissTime) / (1000 * 60 * 60);
      if (hoursSinceDismiss < 168) {
        setDismissed(true);
      }
    }

    const appInstalledHandler = () => {
      setIsInstalled(true);
      setShowPrompt(false);
      localStorage.setItem(INSTALLED_KEY, 'true');
    };
    window.addEventListener('appinstalled', appInstalledHandler);

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
      window.removeEventListener('appinstalled', appInstalledHandler);
    };
  }, []);

  const getTodayShowCount = (): number => {
    const today = new Date().toDateString();
    const savedDate = localStorage.getItem(SHOW_DATE_KEY);
    if (savedDate !== today) {
      localStorage.setItem(SHOW_DATE_KEY, today);
      localStorage.setItem(SHOW_COUNT_KEY, '0');
      return 0;
    }
    return parseInt(localStorage.getItem(SHOW_COUNT_KEY) || '0', 10);
  };

  const incrementShowCount = () => {
    const count = getTodayShowCount();
    localStorage.setItem(SHOW_COUNT_KEY, String(count + 1));
  };

  useEffect(() => {
    if (isInstalled || dismissed) return;
    if (!deferredPrompt && !isIOS) return;

    const timer = setTimeout(() => {
      const count = getTodayShowCount();
      if (count < MAX_SHOWS_PER_DAY) {
        setShowPrompt(true);
        incrementShowCount();
      }
    }, 4000);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deferredPrompt, isIOS, isInstalled, dismissed]);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    try {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;

      if (outcome === 'accepted') {
        setShowPrompt(false);
        setIsInstalled(true);
        localStorage.setItem(INSTALLED_KEY, 'true');
      }
    } catch (error) {
      console.error('Install prompt error:', error);
    }

    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    setDismissed(true);
    localStorage.setItem(DISMISS_KEY, Date.now().toString());
  };

  if (isInstalled) return null;
  if (!showPrompt) return null;
  if (!isIOS && !deferredPrompt) return null;

  // iOS Install Instructions
  if (isIOS) {
    return (
      <div className="fixed bottom-[calc(4rem+env(safe-area-inset-bottom))] left-2 right-2 sm:left-4 sm:right-auto sm:max-w-sm z-50 animate-in slide-in-from-bottom duration-300">
        <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 p-4 sm:p-5 relative">
          <button
            onClick={handleDismiss}
            className="absolute top-2 right-2 w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 hover:text-slate-700 transition-colors"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
          <div className="flex items-center gap-3 mb-3 pr-8">
            <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center shrink-0">
              <Smartphone className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-sm sm:text-base">Install Trinomul App</h3>
              <p className="text-xs text-slate-500">For the best experience</p>
            </div>
          </div>

          <div className="bg-slate-50 rounded-xl p-3 sm:p-4 space-y-2 text-xs sm:text-sm text-slate-700">
            <p className="font-medium text-slate-900">To install on your device:</p>
            <ol className="space-y-1.5 list-decimal list-inside">
              <li>Tap the <strong>Share button</strong> <span className="inline-block px-1.5 py-0.5 bg-slate-200 rounded text-xs">⎋</span> in Safari</li>
              <li>Scroll down and tap <strong>"Add to Home Screen"</strong></li>
              <li>Tap <strong>"Add"</strong> to confirm</li>
            </ol>
          </div>

          <button
            onClick={handleDismiss}
            className="w-full mt-3 py-2.5 bg-red-600 text-white rounded-xl font-semibold hover:bg-red-700 transition-colors text-sm"
          >
            Got it, thanks!
          </button>
          <Link
            href="/downloads"
            onClick={() => setShowPrompt(false)}
            className="block text-center mt-2 text-xs text-slate-500 hover:text-red-600 transition-colors"
          >
            <span className="inline-flex items-center gap-1">
              <ExternalLink className="w-3 h-3" />
              Go to Download Page
            </span>
          </Link>
        </div>
      </div>
    );
  }

  // Android/Other Install Prompt
  return (
    <div className="fixed bottom-[calc(4rem+env(safe-area-inset-bottom))] left-2 right-2 sm:left-4 sm:right-auto sm:max-w-sm z-50 animate-in slide-in-from-bottom duration-300">
      <div className="bg-white rounded-2xl shadow-2xl border border-red-100 p-4 sm:p-5 relative">
        <button
          onClick={handleDismiss}
          className="absolute top-2 right-2 w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 hover:text-slate-700 transition-colors z-10"
          aria-label="Close"
        >
          <X className="w-4 h-4" />
        </button>
        <div className="flex items-center gap-3 mb-3 pr-8">
          <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-red-500 to-red-600 rounded-2xl flex items-center justify-center shadow-lg shadow-red-200 shrink-0">
            <DropletsIcon className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
          </div>
          <div>
            <h3 className="font-bold text-slate-900 text-sm sm:text-base">Install Trinomul Blood Bank</h3>
            <p className="text-xs sm:text-sm text-slate-500 flex items-center gap-1">
              <Wifi className="w-3 h-3" /> Works offline too!
            </p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 sm:gap-3 mb-3 sm:mb-4">
          <div className="text-center p-1.5 sm:p-2 bg-red-50 rounded-lg">
            <Download className="w-4 h-4 sm:w-5 sm:h-5 mx-auto mb-1 text-red-600" />
            <span className="text-[9px] sm:text-[10px] font-medium text-red-700">No Store</span>
          </div>
          <div className="text-center p-1.5 sm:p-2 bg-blue-50 rounded-lg">
            <Monitor className="w-4 h-4 sm:w-5 sm:h-5 mx-auto mb-1 text-blue-600" />
            <span className="text-[9px] sm:text-[10px] font-medium text-blue-700">Full Screen</span>
          </div>
          <div className="text-center p-1.5 sm:p-2 bg-green-50 rounded-lg">
            <Wifi className="w-4 h-4 sm:w-5 sm:h-5 mx-auto mb-1 text-green-600" />
            <span className="text-[9px] sm:text-[10px] font-medium text-green-700">Offline Mode</span>
          </div>
        </div>

        <div className="flex gap-2 sm:gap-3">
          <button
            onClick={handleInstall}
            className="flex-1 bg-red-600 text-white py-2.5 sm:py-3 rounded-xl font-semibold hover:bg-red-700 transition-colors flex items-center justify-center gap-2 text-sm"
          >
            <Download className="w-4 h-4" />
            Install Now
          </button>
          <button
            onClick={handleDismiss}
            className="px-3 sm:px-4 py-2.5 sm:py-3 text-slate-500 hover:text-slate-700 font-medium text-sm"
          >
            Later
          </button>
        </div>
        <Link
          href="/downloads"
          onClick={() => setShowPrompt(false)}
          className="block text-center mt-2 text-xs text-slate-500 hover:text-red-600 transition-colors"
        >
          <span className="inline-flex items-center gap-1">
            <ExternalLink className="w-3 h-3" />
            Go to Download Page
          </span>
        </Link>
      </div>
    </div>
  );
}

// Simple droplets icon for the component
function DropletsIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M7 16.3c2.2 0 4-1.83 4-4.05 0-1.95-1.37-4.07-3.5-6.25C5.38 8.18 4 10.3 4 12.25c0 2.22 1.8 4.05 4 4.05z"/>
      <path d="M12.56 6.58A9.96 9.96 0 0012 4c-1.63 2.08-3 4.2-3 6.15C9 13.35 11 15.3 14 15.3V11c-.93 0-1.77-.36-2.44-.94z"/>
    </svg>
  );
}
