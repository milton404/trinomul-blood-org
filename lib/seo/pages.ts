import type { Metadata } from "next";
import {
  SITE_URL,
  SITE_NAME,
  SITE_NAME_BN,
} from "@/lib/seo";
import type { OgCardProps } from "@/lib/og/og-card";

export type PageKey =
  | "donors"
  | "requests"
  | "request"
  | "becomeDonor"
  | "bloodBank"
  | "map"
  | "leaderboard"
  | "transparency"
  | "teams"
  | "feed"
  | "guidance"
  | "about"
  | "contact"
  | "privacy"
  | "terms";

type PageSeo = {
  path: string;
  titleEn: string;
  titleBn: string;
  descriptionEn: string;
  descriptionBn: string;
  badgeEn: string;
};

export const PAGES: Record<PageKey, PageSeo> = {
  donors: {
    path: "/donors",
    titleEn: "Find Blood Donors",
    titleBn: "রক্তদাতা খুঁজুন",
    descriptionEn:
      "Search verified blood donors across Rangpur division by blood group, area and distance. Contact donors directly.",
    descriptionBn:
      "রক্তের গ্রুপ, এলাকা ও দূরত্ব অনুযায়ী রংপুর বিভাগের যাচাইকৃত রক্তদাতা খুঁজুন ও সরাসরি যোগাযোগ করুন।",
    badgeEn: "Donor Directory",
  },
  requests: {
    path: "/requests",
    titleEn: "Active Blood Requests",
    titleBn: "চলমান রক্তের অনুরোধ",
    descriptionEn:
      "View active emergency blood requests across Rangpur division. Respond to a request and help save a life.",
    descriptionBn:
      "রংপুর বিভাগের চলমান জরুরি রক্তের অনুরোধ দেখুন। একটি অনুরোধে সাড়া দিন ও প্রাণ বাঁচান।",
    badgeEn: "Emergency Requests",
  },
  request: {
    path: "/request",
    titleEn: "Request Blood",
    titleBn: "রক্তের অনুরোধ করুন",
    descriptionEn:
      "Post an emergency blood request. It instantly reaches nearby donors across Rangpur division.",
    descriptionBn:
      "জরুরি রক্তের অনুরোধ জমা দিন। এটি রংপুর বিভাগের কাছাকাছি রক্তদাতাদের কাছে তাৎক্ষণিকভাবে পৌঁছে যাবে।",
    badgeEn: "Post a Request",
  },
  becomeDonor: {
    path: "/become-donor",
    titleEn: "Become a Blood Donor",
    titleBn: "রক্তদাতা হোন",
    descriptionEn:
      "Register as a blood donor and help save lives across Rangpur division, Bangladesh.",
    descriptionBn:
      "রক্তদাতা হিসেবে নিবন্ধন করুন ও রংপুর বিভাগে প্রাণ বাঁচাতে সাহায্য করুন।",
    badgeEn: "Donor Registration",
  },
  bloodBank: {
    path: "/blood-bank",
    titleEn: "Blood Bank Directory",
    titleBn: "ব্লাড ব্যাংক ডিরেক্টরি",
    descriptionEn:
      "Browse blood bank area pages across Rangpur division — districts, upazilas and unions.",
    descriptionBn:
      "রংপুর বিভাগের ব্লাড ব্যাংক এলাকা পেজ ব্রাউজ করুন — জেলা, উপজেলা ও ইউনিয়ন।",
    badgeEn: "Area Directory",
  },
  map: {
    path: "/map",
    titleEn: "Donor & Request Map",
    titleBn: "রক্তদাতা ও অনুরোধ ম্যাপ",
    descriptionEn:
      "Explore an interactive map of blood donors and active requests across Rangpur division.",
    descriptionBn:
      "রংপুর বিভাগের রক্তদাতা ও চলমান অনুরোধের ইন্টারঅ্যাকটিভ ম্যাপ দেখুন।",
    badgeEn: "Interactive Map",
  },
  leaderboard: {
    path: "/leaderboard",
    titleEn: "Donor Leaderboard",
    titleBn: "রক্তদাতা লিডারবোর্ড",
    descriptionEn: "Top blood donors ranked by donations across Rangpur division.",
    descriptionBn: "রংপুর বিভাগে রক্তদান অনুযায়ী শীর্ষ রক্তদাতাদের তালিকা।",
    badgeEn: "Top Donors",
  },
  transparency: {
    path: "/transparency",
    titleEn: "Transparency Report",
    titleBn: "স্বচ্ছতা প্রতিবেদন",
    descriptionEn: "Public stats and impact data for Trinomul Blood Bank Rangpur.",
    descriptionBn:
      "তৃণমূল ব্লাড ব্যাংক রংপুরের পাবলিক পরিসংখ্যান ও ইম্প্যাক্ট ডেটা।",
    badgeEn: "Open Data",
  },
  teams: {
    path: "/teams",
    titleEn: "Our Teams",
    titleBn: "আমাদের দল",
    descriptionEn: "Meet the volunteers and teams behind Trinomul Blood Bank Rangpur.",
    descriptionBn:
      "তৃণমূল ব্লাড ব্যাংক রংপুরের স্বেচ্ছাসেবক ও দলের সাথে পরিচিত হোন।",
    badgeEn: "Volunteers",
  },
  feed: {
    path: "/feed",
    titleEn: "Activity Feed",
    titleBn: "কার্যক্রম ফিড",
    descriptionEn:
      "Recent donations, requests and community activity across Rangpur division.",
    descriptionBn:
      "রংপুর বিভাগের সাম্প্রতিক রক্তদান, অনুরোধ ও কমিউনিটি কার্যক্রম।",
    badgeEn: "Live Feed",
  },
  guidance: {
    path: "/guidance",
    titleEn: "Donation Guidance",
    titleBn: "রক্তদান গাইডলাইন",
    descriptionEn:
      "Who can donate, eligibility, before/after care and FAQs about blood donation.",
    descriptionBn:
      "কে রক্ত দিতে পারেন, যোগ্যতা, দানের আগে/পরে যত্ন ও সাধারণ প্রশ্ন।",
    badgeEn: "Guide & FAQ",
  },
  about: {
    path: "/about",
    titleEn: "About Us",
    titleBn: "আমাদের সম্পর্কে",
    descriptionEn:
      "Trinomul is a community-based voluntary organization in Rangpur, Bangladesh, fighting for humanity since 2017.",
    descriptionBn:
      "তৃণমূল রংপুরের একটি কমিউনিটি-ভিত্তিক স্বেচ্ছাসেবী সংগঠন, ২০১৭ থেকে মানবসেবায় নিয়োজিত।",
    badgeEn: "About",
  },
  contact: {
    path: "/contact",
    titleEn: "Contact Us",
    titleBn: "যোগাযোগ",
    descriptionEn: "Reach Trinomul Blood Bank Rangpur — phone, email and social links.",
    descriptionBn:
      "তৃণমূল ব্লাড ব্যাংক রংপুরের সাথে যোগাযোগ করুন — ফোন, ইমেইল ও সোশ্যাল।",
    badgeEn: "Contact",
  },
  privacy: {
    path: "/privacy",
    titleEn: "Privacy Policy",
    titleBn: "প্রাইভেসি পলিসি",
    descriptionEn:
      "How Trinomul Blood Bank Rangpur collects, uses and protects your data.",
    descriptionBn:
      "তৃণমূল ব্লাড ব্যাংক রংপুর আপনার ডেটা কীভাবে সংগ্রহ, ব্যবহার ও সুরক্ষিত করে।",
    badgeEn: "Legal",
  },
  terms: {
    path: "/terms",
    titleEn: "Terms of Service",
    titleBn: "শর্তাবলি",
    descriptionEn: "Terms and conditions for using Trinomul Blood Bank Rangpur.",
    descriptionBn: "তৃণমূল ব্লাড ব্যাংক রংপুর ব্যবহারের শর্ত ও নিয়মাবলি।",
    badgeEn: "Legal",
  },
};

export function buildPageMetadata({
  locale,
  page,
}: {
  locale: string;
  page: PageKey;
}): Metadata {
  const p = PAGES[page];
  const isBn = locale === "bn";
  const title = isBn ? p.titleBn : p.titleEn;
  const description = isBn ? p.descriptionBn : p.descriptionEn;
  const siteName = isBn ? SITE_NAME_BN : SITE_NAME;
  const url = `${SITE_URL}/${locale}${p.path}`;
  const alt = (l: string) => `${SITE_URL}/${l}${p.path}`;
  const fullTitle = `${title} | ${siteName}`;

  return {
    title,
    description,
    alternates: {
      canonical: url,
      languages: {
        en: alt("en"),
        bn: alt("bn"),
        "x-default": alt("bn"),
      },
    },
    openGraph: {
      type: "website",
      url,
      siteName,
      title: fullTitle,
      description,
    },
    twitter: {
      card: "summary_large_image",
      title: fullTitle,
      description,
    },
  };
}

export function pageOgCardProps(page: PageKey): OgCardProps {
  const p = PAGES[page];
  const displayDomain = SITE_URL.replace(/^https?:\/\//, "");
  return {
    title: p.titleEn,
    description: p.descriptionEn,
    badge: p.badgeEn,
    siteName: SITE_NAME,
    siteUrl: displayDomain,
  };
}