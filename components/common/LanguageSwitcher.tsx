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

  return (
    <button
      type="button"
      onClick={() => switchLocale(isBn ? 'en' : 'bn')}
      disabled={isPending}
      aria-label={isBn ? 'Switch to English' : 'Switch to Bangla'}
      aria-pressed={isBn}
      className={`relative grid grid-cols-2 items-center bg-slate-200/60 rounded-full p-1 shrink-0 select-none transition-all duration-200 active:scale-95 disabled:opacity-60 ring-1 ring-inset ring-slate-900/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600/50 ${className}`}
    >
      <span
        className={`absolute top-1 bottom-1 w-[calc(50%-4px)] rounded-full bg-red-600 shadow-sm shadow-red-600/40 transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] ${
          isBn ? 'left-[50%]' : 'left-1'
        }`}
      />
      <span
        className={`relative z-10 px-3 py-1 text-[11px] font-semibold leading-none text-center transition-colors duration-300 ${
          isBn ? 'text-slate-400' : 'text-white'
        }`}
      >
        EN
      </span>
      <span
        className={`relative z-10 px-3 py-1 text-[11px] font-semibold leading-none text-center transition-colors duration-300 ${
          isBn ? 'text-white' : 'text-slate-400'
        }`}
      >
        বাং
      </span>
    </button>
  );
}
