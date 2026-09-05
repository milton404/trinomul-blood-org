import { Metadata } from 'next';

interface SEOProps {
  title: string;
  description?: string;
  path?: string;
  image?: string;
  type?: 'website' | 'article';
}

const defaultDescription = 'Trinomul Blood Bank Rangpur - Connect blood donors with those in need. Find donors, request blood, and save lives in Rangpur division, Bangladesh.';
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://trinomul-blood-bank.vercel.app';
const defaultImage = `${siteUrl}/og-image.png`;

export function generateSEOMetadata({
  title,
  description = defaultDescription,
  path = '/',
  image = defaultImage,
  type = 'website',
}: SEOProps): Metadata {
  const fullTitle = `${title} | Trinomul Blood Bank`;
  const url = `${siteUrl}${path}`;
  
  return {
    title: fullTitle,
    description,
    keywords: [
      'blood bank',
      'blood donation',
      'Rangpur',
      'Bangladesh',
      'donor',
      'blood request',
      'save life',
      'emergency blood',
      'Trinomul',
    ],
    authors: [{ name: 'Trinomul Blood Bank Team' }],
    creator: 'Trinomul Blood Bank',
    publisher: 'Trinomul Blood Bank',
    
    openGraph: {
      title: fullTitle,
      description,
      url,
      siteName: 'Trinomul Blood Bank Rangpur',
      images: [
        {
          url: image,
          width: 1200,
          height: 630,
          alt: title,
        },
      ],
      locale: 'en_US',
      type,
    },
    
    twitter: {
      card: 'summary_large_image',
      title: fullTitle,
      description,
      images: [image],
      creator: '@trinomul_bloodbank',
    },
    
    alternates: {
      canonical: url,
      languages: {
        en: `/en${path !== '/' ? path : ''}`,
        bn: `/bn${path !== '/' ? path : ''}`,
      },
    },
    
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        'max-video-preview': -1,
        'max-image-preview': 'large',
        'max-snippet': -1,
      },
    },
  };
}
