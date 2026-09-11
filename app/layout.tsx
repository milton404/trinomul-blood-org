import "./globals.css";
import { Hind_Siliguri } from "next/font/google";
import type { Viewport, Metadata } from "next";
import AuthProvider from "@/components/providers/AuthProvider";
import SkipToContent from "@/components/common/SkipToContent";
import PWAInstallPrompt from "@/components/common/PWAInstallPrompt";
import NetworkStatus from "@/components/common/NetworkStatus";
import VercelAnalytics from "@/components/analytics/VercelAnalytics";
import { SITE_URL, SITE_NAME, SITE_DISPLAY_DOMAIN } from "@/lib/seo";

const hindSiliguri = Hind_Siliguri({
  subsets: ["bengali", "latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-hind-siliguri",
  display: "swap",
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#dc2626",
};

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: SITE_NAME,
  description:
    "Trinomul Blood Bank Rangpur connects blood donors, patients and hospitals across Rangpur division, Bangladesh. Find blood donors, request blood in an emergency and donate blood to save lives.",
  alternates: {
    canonical: SITE_URL,
  },
  openGraph: {
    type: "website",
    url: SITE_URL,
    siteName: SITE_NAME,
    title: `${SITE_NAME} — Find Blood Donors & Request Blood`,
    description:
      "Find blood donors and request blood in an emergency across Rangpur division, Bangladesh. Join Trinomul Blood Bank Rangpur and save lives.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: SITE_NAME,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: `${SITE_NAME} — Find Blood Donors & Request Blood`,
    description:
      "Find blood donors and request blood in an emergency across Rangpur division, Bangladesh.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: SITE_NAME,
      },
    ],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html suppressHydrationWarning className={hindSiliguri.variable}>
      <head>
        <meta name="mobile-web-app-capable" content="yes" />
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="manifest" href="/manifest.webmanifest" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta
          name="apple-mobile-web-app-status-bar-style"
          content="black-translucent"
        />
        <meta name="apple-mobile-web-app-title" content="Trinomul Blood Bank" />
      </head>
      <body
        suppressHydrationWarning
        className="min-h-screen bg-white antialiased"
      >
        <SkipToContent />
        <NetworkStatus />
        <AuthProvider>{children}</AuthProvider>
        <PWAInstallPrompt />
        <VercelAnalytics />
      </body>
    </html>
  );
}
