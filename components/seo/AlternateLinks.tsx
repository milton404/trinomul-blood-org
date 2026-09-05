"use client";

import { usePathname } from "@/i18n/routing";
import { SITE_URL, LOCALES, DEFAULT_LOCALE } from "@/lib/seo";

export default function AlternateLinks() {
  const pathname = usePathname();

  if (!pathname) return null;

  const segments = pathname.split("/").filter(Boolean);
  const currentLocale = segments[0] ?? DEFAULT_LOCALE;
  const rest = segments.slice(1).join("/");
  const hrefFor = (locale: string) =>
    `${SITE_URL}/${locale}${rest ? `/${rest}` : ""}`;

  return (
    <>
      <link rel="canonical" href={hrefFor(currentLocale)} />
      {LOCALES.map((locale) => (
        <link
          key={locale}
          rel="alternate"
          hrefLang={locale}
          href={hrefFor(locale)}
        />
      ))}
      <link rel="alternate" hrefLang="x-default" href={hrefFor(DEFAULT_LOCALE)} />
    </>
  );
}