import type { MetadataRoute } from 'next';
import { SITE_URL, LOCALES, DEFAULT_LOCALE } from '@/lib/seo';
import { ALL_AREAS } from '@/lib/seo/area-pages';

type Route = {
  path: string;
  changeFrequency: MetadataRoute.Sitemap[number]['changeFrequency'];
  priority: number;
};

const ROUTES: Route[] = [
  { path: '', changeFrequency: 'daily', priority: 1 },
  { path: '/donors', changeFrequency: 'daily', priority: 0.9 },
  { path: '/requests', changeFrequency: 'daily', priority: 0.9 },
  { path: '/request', changeFrequency: 'weekly', priority: 0.9 },
  { path: '/blood-bank', changeFrequency: 'weekly', priority: 0.8 },
  { path: '/become-donor', changeFrequency: 'weekly', priority: 0.8 },
  { path: '/map', changeFrequency: 'weekly', priority: 0.7 },
  { path: '/guidance', changeFrequency: 'monthly', priority: 0.7 },
  { path: '/leaderboard', changeFrequency: 'weekly', priority: 0.6 },
  { path: '/transparency', changeFrequency: 'weekly', priority: 0.6 },
  { path: '/teams', changeFrequency: 'weekly', priority: 0.6 },
  { path: '/feed', changeFrequency: 'daily', priority: 0.5 },
  { path: '/about', changeFrequency: 'monthly', priority: 0.6 },
  { path: '/contact', changeFrequency: 'monthly', priority: 0.6 },
  { path: '/privacy', changeFrequency: 'yearly', priority: 0.3 },
  { path: '/terms', changeFrequency: 'yearly', priority: 0.3 },
];

// path is locale-free ("" for home, "/donors", "/blood-bank/rangpur-sadar", ...)
function withAlternates(path: string): MetadataRoute.Sitemap[number]['alternates'] {
  return {
    languages: {
      ...Object.fromEntries(LOCALES.map((l) => [l, `${SITE_URL}/${l}${path}`])),
      'x-default': `${SITE_URL}/${DEFAULT_LOCALE}${path}`,
    },
  };
}

export default function sitemap(): MetadataRoute.Sitemap {
  const pages = LOCALES.flatMap((locale) =>
    ROUTES.map((route) => {
      const routePath = route.path ? `/${locale}${route.path}` : `/${locale}`;
      return {
        url: `${SITE_URL}${routePath}`,
        lastModified: new Date(),
        changeFrequency: route.changeFrequency,
        priority: route.priority,
        alternates: withAlternates(route.path),
      };
    }),
  );

  const areaPages = LOCALES.flatMap((locale) =>
    ALL_AREAS.map((area) => {
      const path = `/blood-bank/${area.slug}`;
      return {
        url: `${SITE_URL}/${locale}${path}`,
        lastModified: new Date(),
        changeFrequency: 'weekly' as const,
        priority: area.kind === 'union' ? 0.6 : 0.7,
        alternates: withAlternates(path),
      };
    }),
  );

  return [...pages, ...areaPages];
}