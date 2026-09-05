import {
  renderOgImage,
  OG_SIZE,
  OG_CONTENT_TYPE,
} from "@/lib/og/og-card";
import { pageOgCardProps } from "@/lib/seo/pages";

export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default async function Image() {
  return renderOgImage(pageOgCardProps("donors"));
}