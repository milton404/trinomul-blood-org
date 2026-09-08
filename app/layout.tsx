import "./globals.css";
import { Hind_Siliguri } from "next/font/google";
import type { Viewport } from "next";
import AuthProvider from "@/components/providers/AuthProvider";
import SkipToContent from "@/components/common/SkipToContent";
import PWAInstallPrompt from "@/components/common/PWAInstallPrompt";
import NetworkStatus from "@/components/common/NetworkStatus";
import VercelAnalytics from "@/components/analytics/VercelAnalytics";

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
