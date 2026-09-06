'use client';

import { useState, useEffect } from 'react';
import { useLocale } from 'next-intl';
import { Link } from '@/i18n/routing';
import Navbar from '@/components/common/Navbar';
import Footer from '@/components/common/Footer';
import QRCode from 'qrcode';
import {
  Smartphone,
  Monitor,
  Apple,
  Download,
  QrCode,
  Wifi,
  Shield,
  Zap,
  Heart,
  Check,
  Chrome,
  Share,
  Plus,
  X,
} from 'lucide-react';

type DeviceType = 'ios' | 'android' | 'windows' | 'mac' | 'linux' | 'unknown';

function detectDevice(): DeviceType {
  if (typeof window === 'undefined') return 'unknown';
  const ua = navigator.userAgent;
  const isIOS = /iPad|iPhone|iPod/.test(ua) || (ua.includes('Mac') && navigator.maxTouchPoints > 1);
  if (isIOS) return 'ios';
  if (/Android/i.test(ua)) return 'android';
  if (/Win/i.test(ua)) return 'windows';
  if (/Mac/i.test(ua)) return 'mac';
  if (/Linux/i.test(ua)) return 'linux';
  return 'unknown';
}

export default function DownloadsPage() {
  const locale = useLocale();
  const isBn = locale === 'bn';
  const [device, setDevice] = useState<DeviceType>('unknown');
  const [qrUrl, setQrUrl] = useState<string>('');
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    setDevice(detectDevice());
    setIsStandalone(window.matchMedia('(display-mode: standalone)').matches);
    const currentUrl = window.location.origin + '/' + locale;
    QRCode.toDataURL(currentUrl, {
      width: 400,
      margin: 2,
      errorCorrectionLevel: 'H',
      color: { dark: '#dc2626', light: '#ffffff' },
    })
      .then(setQrUrl)
      .catch(() => {});
  }, [locale]);

  const t = (en: string, bn: string) => (isBn ? bn : en);

  const deviceConfig: Record<DeviceType, {
    icon: typeof Smartphone;
    label: string;
    steps: string[];
    browser?: string;
  }> = {
    ios: {
      icon: Apple,
      label: 'iOS (iPhone / iPad)',
      steps: isBn ? [
        'Safari ব্রাউজারে এই পেজটি খুলুন',
        'নিচের Share বাটনে ট্যাপ করুন',
        '"Add to Home Screen" নির্বাচন করুন',
        '"Add" এ ট্যাপ করে নিশ্চিত করুন',
      ] : [
        'Open this page in Safari browser',
        'Tap the Share button below',
        'Select "Add to Home Screen"',
        'Tap "Add" to confirm',
      ],
      browser: 'Safari',
    },
    android: {
      icon: Smartphone,
      label: 'Android',
      steps: isBn ? [
        'Chrome ব্রাউজারে এই পেজটি খুলুন',
        'ব্রাউজার মেনু (⋮) খুলুন',
        '"Install app" বা "Add to Home screen" নির্বাচন করুন',
        '"Install" এ ট্যাপ করুন',
      ] : [
        'Open this page in Chrome browser',
        'Open browser menu (⋮)',
        'Select "Install app" or "Add to Home screen"',
        'Tap "Install" to confirm',
      ],
      browser: 'Chrome',
    },
    windows: {
      icon: Monitor,
      label: 'Windows',
      steps: isBn ? [
        'Chrome বা Edge ব্রাউজারে এই পেজটি খুলুন',
        'ঠিকানার বারে install আইকনে ক্লিক করুন',
        '"Install" বাটনে ক্লিক করুন',
        'অ্যাপ আপনার স্টার্ট মেনুতে যুক্ত হবে',
      ] : [
        'Open this page in Chrome or Edge browser',
        'Click the install icon in the address bar',
        'Click the "Install" button',
        'App will be added to your Start menu',
      ],
      browser: 'Chrome / Edge',
    },
    mac: {
      icon: Apple,
      label: 'macOS',
      steps: isBn ? [
        'Chrome ব্রাউজারে এই পেজটি খুলুন',
        'ঠিকানার বারে install আইকনে ক্লিক করুন',
        '"Install" বাটনে ক্লিক করুন',
        'অ্যাপ আপনার Launchpad-এ যুক্ত হবে',
      ] : [
        'Open this page in Chrome browser',
        'Click the install icon in the address bar',
        'Click the "Install" button',
        'App will be added to your Launchpad',
      ],
      browser: 'Chrome',
    },
    linux: {
      icon: Monitor,
      label: 'Linux',
      steps: isBn ? [
        'Chrome বা Firefox ব্রাউজারে এই পেজটি খুলুন',
        'ঠিকানার বারে install আইকনে ক্লিক করুন',
        '"Install" বাটনে ক্লিক করুন',
      ] : [
        'Open this page in Chrome or Firefox browser',
        'Click the install icon in the address bar',
        'Click the "Install" button',
      ],
      browser: 'Chrome / Firefox',
    },
    unknown: {
      icon: Monitor,
      label: isBn ? 'যেকোনো ডিভাইস' : 'Any Device',
      steps: isBn ? [
        'যেকোনো আধুনিক ব্রাউজারে এই পেজটি খুলুন',
        'ঠিকানার বারে install আইকনে ক্লিক করুন',
        '"Install" বাটনে ক্লিক করুন',
      ] : [
        'Open this page in any modern browser',
        'Click the install icon in the address bar',
        'Click the "Install" button',
      ],
    },
  };

  const currentDevice = deviceConfig[device];
  const DeviceIcon = currentDevice.icon;

  const features = [
    { icon: Zap, title: t('Works Offline', 'অফলাইনে কাজ করে'), desc: t('Access donor info without internet', 'ইন্টারনেট ছাড়া দাতার তথ্য দেখুন') },
    { icon: Wifi, title: t('Fast Loading', 'দ্রুত লোডিং'), desc: t('Instant access from home screen', 'হোম স্ক্রিন থেকে তাৎক্ষণিক অ্যাক্সেস') },
    { icon: Shield, title: t('Secure', 'নিরাপদ'), desc: t('Same security as the web app', 'ওয়েব অ্যাপের মতো নিরাপদ') },
    { icon: Heart, title: t('No Store Needed', 'স্টোর লাগবে না'), desc: t('Install directly from browser', 'ব্রাউজার থেকেই ইনস্টল করুন') },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <Navbar />
      <main className="flex-grow">
        {/* Hero */}
        <section className="bg-gradient-to-br from-red-600 via-red-700 to-red-800 text-white py-12 sm:py-16">
          <div className="max-w-4xl mx-auto px-4 text-center">
            <div className="inline-flex items-center gap-2 bg-white/20 rounded-full px-4 py-1.5 mb-4 text-sm font-medium">
              <Download className="w-4 h-4" />
              {t('PWA', 'PWA')}
            </div>
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-3">
              {t('Download Trinomul Blood Bank', 'তৃণমূল ব্লাড ব্যাংক ডাউনলোড করুন')}
            </h1>
            <p className="text-base sm:text-lg text-red-100 max-w-2xl mx-auto">
              {t(
                'Install our app on your device for the best experience. No app store needed — install directly from your browser.',
                'সেরা অভিজ্ঞতার জন্য আমাদের অ্যাপ আপনার ডিভাইসে ইনস্টল করুন। কোনো অ্যাপ স্টোর লাগবে না — ব্রাউজার থেকেই ইনস্টল করুন।'
              )}
            </p>
          </div>
        </section>

        <div className="max-w-5xl mx-auto px-4 -mt-8 pb-12">
          {/* QR + Device Card */}
          <div className="grid md:grid-cols-2 gap-4 sm:gap-6 mb-6">
            {/* QR Code Card */}
            <div className="bg-white rounded-2xl shadow-xl border border-slate-100 p-5 sm:p-6 text-center">
              <div className="flex items-center justify-center gap-2 mb-4">
                <QrCode className="w-5 h-5 text-red-600" />
                <h2 className="text-lg font-bold text-slate-900">
                  {t('Scan to Download', 'স্ক্যান করে ডাউনলোড করুন')}
                </h2>
              </div>
              {qrUrl ? (
                <div className="inline-block p-3 bg-white rounded-xl border-2 border-slate-100">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={qrUrl} alt="QR Code" width={200} height={200} className="w-44 h-44 sm:w-48 sm:h-48" />
                </div>
              ) : (
                <div className="w-44 h-44 sm:w-48 sm:h-48 mx-auto bg-slate-100 rounded-xl animate-pulse" />
              )}
              <p className="text-sm text-slate-500 mt-4">
                {t(
                  'Scan with your phone camera to open this page on your mobile device',
                  'আপনার ফোনের ক্যামেরা দিয়ে স্ক্যান করুন মোবাইলে এই পেজ খুলতে'
                )}
              </p>
            </div>

            {/* Device-specific Card */}
            <div className="bg-white rounded-2xl shadow-xl border border-slate-100 p-5 sm:p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-red-50 rounded-xl flex items-center justify-center shrink-0">
                  <DeviceIcon className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-900">
                    {t('Your Device', 'আপনার ডিভাইস')}
                  </h2>
                  <p className="text-sm text-slate-500">{currentDevice.label}</p>
                </div>
              </div>

              {isStandalone && (
                <div className="bg-green-50 border border-green-200 rounded-xl p-3 mb-4 flex items-center gap-2">
                  <Check className="w-5 h-5 text-green-600 shrink-0" />
                  <p className="text-sm text-green-700 font-medium">
                    {t('App is already installed!', 'অ্যাপ ইতিমধ্যে ইনস্টল করা!')}
                  </p>
                </div>
              )}

              <ol className="space-y-3">
                {currentDevice.steps.map((step, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <span className="shrink-0 w-6 h-6 rounded-full bg-red-600 text-white text-xs font-bold flex items-center justify-center">
                      {i + 1}
                    </span>
                    <span className="text-sm text-slate-700 pt-0.5">{step}</span>
                  </li>
                ))}
              </ol>

              {currentDevice.browser && (
                <div className="mt-4 flex items-center gap-2 text-xs text-slate-500 bg-slate-50 rounded-lg px-3 py-2">
                  <Chrome className="w-3.5 h-3.5" />
                  {t('Recommended browser: ', 'প্রস্তাবিত ব্রাউজার: ')}
                  <span className="font-medium text-slate-700">{currentDevice.browser}</span>
                </div>
              )}

              {device === 'ios' && (
                <div className="mt-4 flex items-center gap-2 text-xs text-amber-600 bg-amber-50 rounded-lg px-3 py-2">
                  <Share className="w-3.5 h-3.5" />
                  {t('Use Safari — Chrome on iOS cannot install PWAs', 'Safari ব্যবহার করুন — iOS-এ Chrome PWA ইনস্টল করতে পারে না')}
                </div>
              )}
            </div>
          </div>

          {/* Install Button */}
          {!isStandalone && (
            <div className="bg-gradient-to-r from-red-600 to-red-700 rounded-2xl shadow-xl p-5 sm:p-6 text-center text-white mb-6">
              <h3 className="text-lg font-bold mb-2">
                {t('Ready to Install?', 'ইনস্টল করতে প্রস্তুত?')}
              </h3>
              <p className="text-sm text-red-100 mb-4">
                {t(
                  'Click the button below or use the install icon in your browser address bar',
                  'নিচের বাটনে ক্লিক করুন বা ব্রাউজার ঠিকানার বারের install আইকন ব্যবহার করুন'
                )}
              </p>
              <a
                href={`/${locale}`}
                className="inline-flex items-center gap-2 bg-white text-red-600 px-6 py-3 rounded-xl font-bold hover:bg-red-50 transition-colors shadow-lg"
              >
                <Plus className="w-5 h-5" />
                {t('Go to App & Install', 'অ্যাপে যান ও ইনস্টল করুন')}
              </a>
            </div>
          )}

          {/* Features */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mb-6">
            {features.map((f, i) => {
              const Icon = f.icon;
              return (
                <div key={i} className="bg-white rounded-xl shadow-sm border border-slate-100 p-4 text-center">
                  <div className="w-10 h-10 bg-red-50 rounded-xl flex items-center justify-center mx-auto mb-2">
                    <Icon className="w-5 h-5 text-red-600" />
                  </div>
                  <h4 className="text-sm font-bold text-slate-900 mb-1">{f.title}</h4>
                  <p className="text-xs text-slate-500">{f.desc}</p>
                </div>
              );
            })}
          </div>

          {/* All Platforms */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5 sm:p-6">
            <h3 className="text-lg font-bold text-slate-900 mb-4 text-center">
              {t('Available on All Platforms', 'সব প্ল্যাটফর্মে উপলব্ধ')}
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {([
                { key: 'ios', icon: Apple, label: 'iOS' },
                { key: 'android', icon: Smartphone, label: 'Android' },
                { key: 'windows', icon: Monitor, label: 'Windows' },
                { key: 'mac', icon: Apple, label: 'macOS' },
              ] as const).map(({ key, icon: Icon, label }) => (
                <div
                  key={key}
                  className={`rounded-xl p-4 text-center border-2 transition-all ${
                    device === key
                      ? 'border-red-500 bg-red-50'
                      : 'border-slate-100 bg-slate-50'
                  }`}
                >
                  <Icon className={`w-7 h-7 mx-auto mb-2 ${device === key ? 'text-red-600' : 'text-slate-400'}`} />
                  <p className={`text-sm font-medium ${device === key ? 'text-red-700' : 'text-slate-600'}`}>
                    {label}
                  </p>
                  {device === key && (
                    <p className="text-[10px] text-red-500 font-medium mt-1">
                      {t('Your device', 'আপনার ডিভাইস')}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Info */}
          <div className="mt-6 bg-slate-100 rounded-2xl p-5 sm:p-6 text-center">
            <h3 className="text-base font-bold text-slate-900 mb-2">
              {t('About This App', 'এই অ্যাপ সম্পর্কে')}
            </h3>
            <p className="text-sm text-slate-600 max-w-2xl mx-auto mb-4">
              {t(
                'Trinomul Blood Bank is a Progressive Web App (PWA) — it works like a native app but installs directly from your browser. No app store, no downloads from third-party sites, always up-to-date.',
                'তৃণমূল ব্লাড ব্যাংক একটি Progressive Web App (PWA) — এটি নেটিভ অ্যাপের মতো কাজ করে কিন্তু ব্রাউজার থেকেই ইনস্টল হয়। কোনো অ্যাপ স্টোর নেই, তৃতীয়-পক্ষের সাইট থেকে ডাউনলোড নেই, সবসময় আপ-টু-ডেট।'
              )}
            </p>
            <Link
              href="/about"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-red-600 hover:text-red-700"
            >
              {t('Learn more about Trinomul', 'তৃণমূল সম্পর্কে আরও জানুন')}
              →
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}