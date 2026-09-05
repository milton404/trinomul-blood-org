import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/seo';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/api/',
          '/*/admin',
          '/*/profile',
          '/*/bookmarks',
          '/*/complete-profile',
          '/*/forgot-password',
          '/*/reset-password',
        ],
      },
      {
        userAgent: ['Applebot', 'Bingbot', 'Googlebot', 'DuckDuckBot', 'YandexBot'],
        allow: '/',
        disallow: [
          '/api/',
          '/*/admin',
          '/*/profile',
          '/*/bookmarks',
        ],
      },
    ],
    host: SITE_URL,
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}