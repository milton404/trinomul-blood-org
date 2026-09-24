'use client';

import { useLocale } from 'next-intl';
import { useRouter, usePathname } from '@/i18n/routing';
import { Globe } from 'lucide-react';
import { useTransition } from 'react';

interface LanguageSwitcherProps {
  className?: string;
  variant?: 'compact' | 'full';
}

export default function LanguageSwitcher({ className = '', variant = 'compact' }: LanguageSwitcherProps) {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();

  const switchLocale = (newLocale: string) => {
    if (newLocale === locale) return;
    
    document.cookie = `NEXT_LOCALE=${newLocale}; path=/; max-age=31536000; SameSite=lax`;
    
    startTransition(() => {
      router.replace(pathname, { locale: newLocale });
    });
  };

  if (variant === 'full') {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <Globe className="w-4 h-4 text-slate-400" />
        <button
          onClick={() => switchLocale('en')}
          disabled={isPending}
          className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${
            locale === 'en' 
              ? 'bg-red-600 text-white' 
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          English
        </button>
        <button
          onClick={() => switchLocale('bn')}
          disabled={isPending}
          className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${
            locale === 'bn' 
              ? 'bg-red-600 text-white' 
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          বাংলা
        </button>
      </div>
    );
  }

  const isBn = locale === 'bn';

  const toggle = () => switchLocale(isBn ? 'en' : 'bn');

  return (
    <div
      role="group"
      aria-label="Language switcher"
      className={`flex items-center gap-0.5 bg-slate-200/60 rounded-full p-1 shrink-0 select-none ring-1 ring-inset ring-slate-900/5 ${className}`}
    >
      <button
        type="button"
        onClick={toggle}
        disabled={isPending}
        aria-pressed={!isBn}
        className={`px-3 py-1 rounded-full text-[11px] font-semibold transition-all duration-300 leading-none active:scale-95 disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600/50 ${
          !isBn
            ? 'bg-red-600 text-white shadow-sm shadow-red-600/40'
            : 'text-slate-400 hover:text-red-600'
        }`}
      >
        EN
      </button>
      <button
        type="button"
        onClick={toggle}
        disabled={isPending}
        aria-pressed={isBn}
        className={`px-3 py-1 rounded-full text-[11px] font-semibold transition-all duration-300 leading-none active:scale-95 disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600/50 ${
          isBn
            ? 'bg-red-600 text-white shadow-sm shadow-red-600/40'
            : 'text-slate-400 hover:text-red-600'
        }`}
      >
        বাং
      </button>
    </div>
  );
}
