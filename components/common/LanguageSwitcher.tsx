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

  return (
    <div className={`flex items-center gap-0.5 bg-slate-100 rounded-full p-0.5 shrink-0 ${className}`}>
      <button
        onClick={() => switchLocale('en')}
        disabled={isPending}
        className={`px-2.5 py-1 rounded-full text-[11px] font-semibold transition-all leading-none ${
          locale === 'en'
            ? 'bg-red-600 text-white'
            : 'text-slate-600 hover:text-red-600'
        }`}
      >
        EN
      </button>
      <button
        onClick={() => switchLocale('bn')}
        disabled={isPending}
        className={`px-2.5 py-1 rounded-full text-[11px] font-semibold transition-all leading-none ${
          locale === 'bn'
            ? 'bg-red-600 text-white'
            : 'text-slate-600 hover:text-red-600'
        }`}
      >
        বাং
      </button>
    </div>
  );
}
