import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Trinomul Blood Bank Rangpur",
    short_name: "Trinomul",
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
        src: "/icons/icon-72x72.svg",
        sizes: "72x72",
        type: "image/svg+xml",
      },
      {
        src: "/icons/icon-96x96.svg",
        sizes: "96x96",
        type: "image/svg+xml",
      },
      {
        src: "/icons/icon-128x128.svg",
        sizes: "128x128",
        type: "image/svg+xml",
      },
      {
        src: "/icons/icon-144x144.svg",
        sizes: "144x144",
        type: "image/svg+xml",
      },
      {
        src: "/icons/icon-152x152.svg",
        sizes: "152x152",
        type: "image/svg+xml",
      },
      {
        src: "/icons/icon-192x192.svg",
        sizes: "192x192",
        type: "image/svg+xml",
      },
      {
        src: "/icons/icon-384x384.svg",
        sizes: "384x384",
        type: "image/svg+xml",
      },
      {
        src: "/icons/icon-512x512.svg",
        sizes: "512x512",
        type: "image/svg+xml",
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
        icons: [{ src: "/icons/icon-96x96.svg", sizes: "96x96" }],
      },
      {
        name: "Find Donors",
        short_name: "Donors",
        description: "Browse blood donors",
        url: "/en/donors",
        icons: [{ src: "/icons/icon-96x96.svg", sizes: "96x96" }],
      },
      {
        name: "My Profile",
        short_name: "Profile",
        description: "View and edit your profile",
        url: "/en/profile",
        icons: [{ src: "/icons/icon-96x96.svg", sizes: "96x96" }],
      },
      {
        name: "Track Request",
        short_name: "Track",
        description: "Track a blood request by code",
        url: "/en/track",
        icons: [{ src: "/icons/icon-96x96.svg", sizes: "96x96" }],
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
