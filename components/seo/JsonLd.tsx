import { organizationJsonLd } from "@/lib/seo";

export default function JsonLd({ locale }: { locale: string }) {
  const data = organizationJsonLd(locale);
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}