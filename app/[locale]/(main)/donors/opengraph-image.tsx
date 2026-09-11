import {
  renderOgImage,
  OG_SIZE,
  OG_CONTENT_TYPE,
} from "@/lib/og/og-card";
import { pageOgCardProps } from "@/lib/seo/pages";
import { serverGetDonorByIdWithStats } from "@/lib/db-actions";
import { SITE_NAME, SITE_NAME_BN, SITE_DISPLAY_DOMAIN } from "@/lib/seo";

export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default async function Image({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ donor?: string }>;
}) {
  const { locale } = await params;
  const { donor: donorId } = await searchParams;
  const isBn = locale === "bn";

  if (donorId) {
    try {
      const id = Number(donorId);
      if (id > 0) {
        const donor = await serverGetDonorByIdWithStats(id);
        if (donor) {
          const name = isBn
            ? (donor.full_name_bn || donor.full_name_en || donor.full_name)
            : (donor.full_name_en || donor.full_name || donor.full_name_bn);
          const location = [donor.upazila, donor.district]
            .filter(Boolean)
            .join(", ");
          return renderOgImage({
            title: name || (isBn ? "\u09B0\u0995\u09CD\u09A4\u09A6\u09BE\u09A4\u09BE" : "Blood Donor"),
            description: isBn
              ? `${donor.blood_group ?? ""} \u00B7 ${location || "\u09B0\u0982\u09AA\u09C1\u09B0 \u09AC\u09BF\u09AD\u09BE\u0997"}`
              : `${donor.blood_group ?? ""} \u00B7 ${location || "Rangpur Division"}`,
            badge: donor.blood_group || (isBn ? "\u09B0\u0995\u09CD\u09A4\u09A6\u09BE\u09A4\u09BE" : "Blood Donor"),
            siteName: isBn ? SITE_NAME_BN : SITE_NAME,
            siteUrl: SITE_DISPLAY_DOMAIN,
          });
        }
      }
    } catch {}
  }

  return renderOgImage(pageOgCardProps("donors", locale));
}
