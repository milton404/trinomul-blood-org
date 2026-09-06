import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Trinomul Blood Bank",
    short_name: "Trinomul Blood Bank",
    description:
      "Trinomul Blood Bank Rangpur connects blood donors, patients and hospitals across Rangpur division, Bangladesh. Find blood donors, request blood in an emergency and donate blood to save lives in Rangpur, Dinajpur, Kurigram, Lalmonirhat, Nilphamari, Gaibandha, Thakurgaon and Panchagarh.",
    start_url: "/en",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#dc2626",
    orientation: "portrait-primary",
    scope: "/",
    icons: [
      {
        src: "/android-chrome-192x192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/android-chrome-512x512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/maskable-512x512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/apple-touch-icon.png",
        sizes: "180x180",
        type: "image/png",
        purpose: "any",
      },
    ],
    categories: ["health", "medical", "social"],
    shortcuts: [
      {
        name: "Request Blood",
        short_name: "Request",
        description: "Create a blood request immediately",
        url: "/en/request",
        icons: [{ src: "/android-chrome-192x192.png", sizes: "192x192" }],
      },
      {
        name: "Find Donors",
        short_name: "Donors",
        description: "Browse blood donors",
        url: "/en/donors",
        icons: [{ src: "/android-chrome-192x192.png", sizes: "192x192" }],
      },
      {
        name: "My Profile",
        short_name: "Profile",
        description: "View and edit your profile",
        url: "/en/profile",
        icons: [{ src: "/android-chrome-192x192.png", sizes: "192x192" }],
      },
      {
        name: "Track Request",
        short_name: "Track",
        description: "Track a blood request by code",
        url: "/en/track",
        icons: [{ src: "/android-chrome-192x192.png", sizes: "192x192" }],
      },
    ],
    screenshots: [
      {
        src: "/screenshots/home.svg",
        sizes: "1080x1920",
        type: "image/svg+xml",
        form_factor: "narrow",
        label: "Home Screen - Find Blood Donors",
      },
      {
        src: "/screenshots/request.svg",
        sizes: "1080x1920",
        type: "image/svg+xml",
        form_factor: "narrow",
        label: "Request Blood - Emergency SOS Mode",
      },
    ],
  };
}
