import { NextIntlClientProvider } from 'next-intl';
import { getMessages, getLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { routing } from '@/i18n/routing';
import type { Metadata } from 'next';
import ChatWidget from '@/components/ai/ChatWidget';
import PresenceHeartbeat from '@/components/PresenceHeartbeat';
import JsonLd from '@/components/seo/JsonLd';
import AlternateLinks from '@/components/seo/AlternateLinks';
import { getSeoTexts, SITE_URL, SITE_NAME, SITE_NAME_BN } from '@/lib/seo';


export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = getSeoTexts(locale);
  const isBn = locale === 'bn';

  return {
    metadataBase: new URL(SITE_URL),
    title: {
      default: t.title,
      template: isBn
        ? `%s | ${'তৃণমূল ব্লাড ব্যাংক রংপুর'}`
        : `%s | Trinomul Blood Bank`,
    },
    description: t.description,
    keywords: t.keywords,
    applicationName: t.title,
    authors: [{ name: 'Trinomul Blood Bank Team' }],
    creator: 'Trinomul Blood Bank',
    publisher: 'Trinomul Blood Bank',
    formatDetection: { email: false, address: false, telephone: false },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        'max-snippet': -1,
        'max-image-preview': 'large',
        'max-video-preview': -1,
      },
    },
    alternates: {
      canonical: `${SITE_URL}/${locale}`,
      languages: {
        en: `${SITE_URL}/en`,
        bn: `${SITE_URL}/bn`,
        'x-default': `${SITE_URL}/bn`,
      },
    },
    icons: {
      icon: [
        { url: '/favicon.ico', sizes: 'any' },
        { url: '/favicon-16x16.png', type: 'image/png', sizes: '16x16' },
        { url: '/favicon-32x32.png', type: 'image/png', sizes: '32x32' },
      ],
      apple: '/apple-touch-icon.png',

    },
    manifest: '/manifest.webmanifest',
    openGraph: {
      type: 'website',
      url: `${SITE_URL}/${locale}`,
      locale: t.ogLocale,
      alternateLocale: t.ogLocaleAlternate,
      siteName: isBn ? SITE_NAME_BN : SITE_NAME,
      title: t.ogTitle,
      description: t.ogDescription,
      images: [
        {
          url: '/og-image.png',
          width: 1200,
          height: 630,
          alt: isBn ? SITE_NAME_BN : SITE_NAME,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: t.ogTitle,
      description: t.ogDescription,
      images: [
        {
          url: '/og-image.png',
          width: 1200,
          height: 630,
          alt: isBn ? SITE_NAME_BN : SITE_NAME,
        },
      ],
    },
  };
}

export default async function LocaleLayout({
  children,
  params
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale: paramLocale } = await params;
  
  if (!routing.locales.includes(paramLocale as (typeof routing.locales)[number])) {
    notFound();
  }

  const locale = await getLocale();
  const messages = await getMessages();

  return (
    <NextIntlClientProvider messages={messages} locale={locale}>
      <JsonLd locale={locale} />
      {children}
      <ChatWidget />
      <PresenceHeartbeat />
      <AlternateLinks />
    </NextIntlClientProvider>
  );
}
