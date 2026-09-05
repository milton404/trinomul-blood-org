'use client';

import { useState, useEffect } from 'react';
import { Download, X, Smartphone, Monitor, Wifi } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export default function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
      return;
    }

    // Detect iOS
    const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent) || 
                        (navigator.userAgent.includes('Mac') && navigator.maxTouchPoints > 1);
    setIsIOS(isIOSDevice);

    // Listen for beforeinstallprompt
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      
      // Show prompt after a delay (don't annoy users immediately)
      setTimeout(() => {
        if (!dismissed) setShowPrompt(true);
      }, 5000);
    };

    window.addEventListener('beforeinstallprompt', handler);

    // Check if dismissed before
    const wasDismissed = localStorage.getItem('pwa-install-dismissed');
    if (wasDismissed) {
      const dismissTime = parseInt(wasDismissed, 10);
      const hoursSinceDismiss = (Date.now() - dismissTime) / (1000 * 60 * 60);
      
      // Show again after 7 days
      if (hoursSinceDismiss < 168) {
        setDismissed(true);
      }
    }

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, [dismissed]);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    try {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      
      if (outcome === 'accepted') {
        setShowPrompt(false);
        setIsInstalled(true);
        console.log('PWA installed successfully');
      }
    } catch (error) {
      console.error('Install prompt error:', error);
    }
    
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    setDismissed(true);
    localStorage.setItem('pwa-install-dismissed', Date.now().toString());
  };

  const handleShowPrompt = () => {
    setShowPrompt(true);
  };

  // Don't render if installed or no prompt available (and not iOS)
  if (isInstalled) return null;
  if (!showPrompt && !isIOS && !deferredPrompt) return null;

  // iOS Install Instructions
  if (isIOS && showPrompt) {
    return (
      <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:max-w-md z-50 animate-in slide-in-from-bottom duration-300">
        <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 p-5">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center">
                <Smartphone className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900">Install Trinomul App</h3>
                <p className="text-xs text-slate-500">For the best experience</p>
              </div>
            </div>
            <button 
              onClick={handleDismiss}
              className="text-slate-400 hover:text-slate-600 p-1"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="bg-slate-50 rounded-xl p-4 space-y-2 text-sm text-slate-700">
            <p className="font-medium text-slate-900">To install on your device:</p>
            <ol className="space-y-2 list-decimal list-inside">
              <li>Tap the <strong>Share button</strong> <span className="inline-block px-1.5 py-0.5 bg-slate-200 rounded text-xs">⎋</span> in Safari</li>
              <li>Scroll down and tap <strong>"Add to Home Screen"</strong></li>
              <li>Tap <strong>"Add"</strong> to confirm</li>
            </ol>
          </div>

          <button
            onClick={handleDismiss}
            className="w-full mt-4 py-2.5 bg-red-600 text-white rounded-xl font-semibold hover:bg-red-700 transition-colors"
          >
            Got it, thanks!
          </button>
        </div>
      </div>
    );
  }

  // Android/Other Install Prompt
  if (!isIOS && showPrompt && deferredPrompt) {
    return (
      <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:max-w-md z-50 animate-in slide-in-from-bottom duration-300">
        <div className="bg-white rounded-2xl shadow-2xl border border-red-100 p-5">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-red-500 to-red-600 rounded-2xl flex items-center justify-center shadow-lg shadow-red-200">
                <DropletsIcon className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900">Install Trinomul Blood Bank</h3>
                <p className="text-sm text-slate-500 flex items-center gap-1">
                  <Wifi className="w-3 h-3" /> Works offline too!
                </p>
              </div>
            </div>
            <button 
              onClick={handleDismiss}
              className="text-slate-400 hover:text-slate-600 p-1"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="grid grid-cols-3 gap-3 mb-4">
            <div className="text-center p-2 bg-red-50 rounded-lg">
              <Download className="w-5 h-5 mx-auto mb-1 text-red-600" />
              <span className="text-[10px] font-medium text-red-700">No Store</span>
            </div>
            <div className="text-center p-2 bg-blue-50 rounded-lg">
              <Monitor className="w-5 h-5 mx-auto mb-1 text-blue-600" />
              <span className="text-[10px] font-medium text-blue-700">Full Screen</span>
            </div>
            <div className="text-center p-2 bg-green-50 rounded-lg">
              <Wifi className="w-5 h-5 mx-auto mb-1 text-green-600" />
              <span className="text-[10px] font-medium text-green-700">Offline Mode</span>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleInstall}
              className="flex-1 bg-red-600 text-white py-3 rounded-xl font-semibold hover:bg-red-700 transition-colors flex items-center justify-center gap-2"
            >
              <Download className="w-4 h-4" />
              Install Now
            </button>
            <button
              onClick={handleDismiss}
              className="px-4 py-3 text-slate-500 hover:text-slate-700 font-medium"
            >
              Later
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Floating install button (when prompt available but not showing)
  if (!isIOS && deferredPrompt && !showPrompt && !dismissed) {
    return (
      <button
        onClick={handleShowPrompt}
        className="fixed bottom-20 right-4 z-40 bg-red-600 text-white p-4 rounded-full shadow-lg hover:bg-red-700 transition-all hover:scale-105 group"
        aria-label="Install app"
      >
        <Download className="w-6 h-6" />
        <span className="absolute right-full mr-3 top-1/2 -translate-y-1/2 bg-slate-900 text-white text-sm px-3 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
          Install App
        </span>
      </button>
    );
  }

  return null;
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
